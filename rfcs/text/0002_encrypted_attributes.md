- Start Date: 2019-03-22
- RFC PR: [#33740](https://github.com/elastic/kibana/pull/33740)
- Kibana Issue: (leave this empty)

# Summary

In order to support the action service we need a way to encrypt/decrypt
attributes on saved objects that works with security and spaces filtering as
well as performing audit logging. Sufficiently hides the private key used and
removes encrypted attributes from being exposed through regular means.

# Basic example

Register saved object type with the `encrypted_saved_objects` plugin:

```typescript
server.plugins.encrypted_saved_objects.registerType({
  type: 'server-action',
  attributesToEncrypt: new Set(['credentials', 'apiKey']),
});
```

Use the same API to create saved objects with encrypted attributes as for any other saved object type:

```typescript
const savedObject = await server.savedObjects
  .getScopedSavedObjectsClient(request)
  .create('server-action', { 
    name: 'my-server-action',
    data: { location: 'BBOX (100.0, ..., 0.0)', email: '<html>...</html>' },
    credentials: { username: 'some-user', password: 'some-password' },
    apiKey: 'dGhpcyBpcyBub3QgYSByZWFsIHRva2VuIGJ1dCBpdCBpcyBvb'
  });

// savedObject = { 
//   id: 'dd9750b9-ef0a-444c-8405-4dfcc2e9d670',
//   type: 'server-action',
//   name: 'my-server-action',
//   data: { location: 'BBOX (100.0, ..., 0.0)', email: '<html>...</html>' },
// };

```

Use dedicated method to retrieve saved object with decrypted attributes on behalf of Kibana internal user:

```typescript
const savedObject = await server.plugins.encrypted_saved_objects.getDecryptedAsInternalUser(
  'server-action',
  'dd9750b9-ef0a-444c-8405-4dfcc2e9d670'
);

// savedObject = { 
//   id: 'dd9750b9-ef0a-444c-8405-4dfcc2e9d670',
//   type: 'server-action',
//   name: 'my-server-action',
//   data: { location: 'BBOX (100.0, ..., 0.0)', email: '<html>...</html>' },
//   credentials: { username: 'some-user', password: 'some-password' },
//   apiKey: 'dGhpcyBpcyBub3QgYSByZWFsIHRva2VuIGJ1dCBpdCBpcyBvb',
// };
```

# Motivation

Main motivation is the storage and usage of third-party credentials for use with
the action service to do notifications. Also perform other types integrations,
call webhooks using tokens.

# Detailed design

In order for this to be in basic it needs to be done as a wrapper around the
saved object client. This can be added from the `x-pack` plugin.

## General

To be able to manage saved objects with encrypted attributes from any plugin one should
do the following:

1. Define `encrypted_saved_objects` plugin as a dependency.
2. Add attributes to be encrypted in `mappings.json` file for the respective saved object type. These attributes should
always have a `binary` type since they'll contain encrypted content as a `Base64` encoded string and should never be
searchable or analyzed. This makes defining of attributes that require encryption explicit and auditable, and significantly
simplifies implementation:
```json
{
 "server-action": {
   "properties": {
     "name": { "type": "keyword" },
     "data": { 
       "properties": {
          "location":  { "type": "geo_shape" },
          "email": { "type": "text" }
        }
     },
     "credentials": { "type": "binary" },
     "apiKey": { "type": "binary" }
   }
 }
}
```
3. Register saved object type and attributes that should be encrypted with `encrypted_saved_objects` plugin:
```typescript
server.plugins.encrypted_saved_objects.registerType({
  type: 'server-action',
  attributesToEncrypt: new Set(['credentials', 'apiKey']),
  attributesToExcludeFromAAD: new Set(['data']),
});
```

Notice the optional `attributesToExcludeFromAAD` property, it allows one to exclude some of the saved object attributes
from Additional authenticated data (AAD), read more about that below in `Encryption and decryption` section.

Since `encrypted_saved_objects` adds its own wrapper (`EncryptedSavedObjectsClientWrapper`) into `SavedObjectsClient`
wrapper chain consumers will be able to create, update, delete and retrieve saved objects using standard Saved Objects API.
Two main responsibilities of the wrapper are:

* It encrypts attributes that are supposed to be encrypted during `create`, `bulkCreate` and `update` operations
* It strips encrypted attributes from **any** saved object returned from the Saved Objects API

As noted above the wrapper is stripping encrypted attributes from saved objects returned from the API methods, that means
that there is no way at all to retrieve encrypted attributes using standard Saved Objects API unless `encrypted_saved_objects`
plugin is disabled. This potentially can lead to the situation when consumer retrieves saved object, updates its non-encrypted
properties and passes that same object to the `update` Saved Objects API method without re-defining encrypted attributes. In
this case only specified attributes will be updated and encrypted attributes will stay untouched. And if these updated 
attributes are included into AAD, that is true by default for all attributes unless they are specifically excluded via 
`attributesToExcludeFromAAD`, then it will be no longer possible to decrypt encrypted attributes. At this stage we consider
this as a developer mistake and don't prevent it from happening in any way apart from logging this type of event. Partial 
update of only attributes that are not the part of AAD will not cause this issue. 

Saved object ID is an essential part of AAD used during encryption process and hence should be as hard to guess as possible.
To fulfil this requirement wrapper generates highly random IDs (UUIDv4) for the saved objects that contain encrypted
attributes and hence consumers are not allowed to specify ID when calling `create` or `bulkCreate` method and if they try
to do so the error will be thrown.

To reduce the risk of unintentional decryption and consequent leaking of the sensitive information there is only one way
to retrieve saved object and decrypt its encrypted attributes and it's exposed only through `encrypted_saved_objects` plugin:

```typescript
const savedObject = await server.plugins.encrypted_saved_objects.getDecryptedAsInternalUser(
  'server-action',
  'dd9750b9-ef0a-444c-8405-4dfcc2e9d670'
);

// savedObject = { 
//   id: 'dd9750b9-ef0a-444c-8405-4dfcc2e9d670',
//   type: 'server-action',
//   name: 'my-server-action',
//   data: { location: 'BBOX (100.0, ..., 0.0)', email: '<html>...</html>' },
//   credentials: { username: 'some-user', password: 'some-password' },
//   apiKey: 'dGhpcyBpcyBub3QgYSByZWFsIHRva2VuIGJ1dCBpdCBpcyBvb',
// };
```

As can be seen from the method name, the request to retrieve saved object and decrypt its attributes is performed on
behalf of the internal Kibana user and hence isn't supposed to be called within user request context.

**Note:** the fact that saved object with encrypted attributes is created using standard Saved Objects API within a 
particular user and space context, but retrieved out of any context makes it unclear how consumers are supposed to 
provide that context and retrieve saved object from a particular space. Current plan for `getDecryptedAsInternalUser` 
method is to accept a third `BaseOptions` argument that allows consumers to specify `namespace` that they can retrieve
from the request using public `spaces` plugin API.

## Encryption and decryption

Saved object attributes are encrypted using [@elastic/node-crypto](https://github.com/elastic/node-crypto) library. Please
take a look at the source code of this library to know how encryption is performed exactly, what algorithm and encryption 
parameters are used, but in short it's AES Encryption with AES-256-GCM that uses random initialization vector and salt.

As with encryption key for Kibana's session cookie, master encryption key used by `encrypted_saved_objects` plugin can be
defined as a configuration value (`xpack.encrypted_saved_objects.encryptionKey`) via `kibana.yml`, but it's **highly 
recommended** to define this key in the [Kibana Keystore](https://www.elastic.co/guide/en/kibana/current/secure-settings.html)
instead. The master key should be cryptographically safe and be equal or greater than 32 bytes.

To prevent certain vectors of attacks where raw content of encrypted attributes of one saved object is copied to another
saved object which would unintentionally allow it to decrypt content that was not supposed to be decrypted we rely on Additional
authenticated data (AAD) during encryption and decryption. AAD consists of the following components:

* Saved object ID
* Saved object type
* Saved object attributes
 
AAD does not include encrypted attributes themselves and attributes defined in optional `attributesToExcludeFromAAD` 
parameter provided during saved object type registration with `encrypted_saved_objects` plugin. There are a number of 
reasons why one would want to exclude certain attributes from AAD:

* if attribute contains large amount of data that can significantly slow down encryption and decryption, especially during
bulk operations (e.g. large geo shape or arbitrary HTML document)
* if attribute contains data that is supposed to be updated separately from encrypted attributes or attributes included
into AAD (e.g some user defined content associated with the email action or alert)

## Audit

Encrypted attributes will most likely contain sensitive information and any attempt to access these should be properly
logged to allow any further audit procedures. The following events will be logged with Kibana audit log functionality:

* Successful attempt to encrypt attributes (incl. saved object ID, type and attributes names)
* Failed attempt to encrypt attribute (incl. saved object ID, type and attribute name)
* Successful attempt to decrypt attributes (incl. saved object ID, type and attributes names)
* Failed attempt to decrypt attribute (incl. saved object ID, type and attribute name)

In addition to audit log events we'll issue ordinary log events for any attempts to save, update or decrypt saved objects
with missing attributes that were supposed to be encrypted/decrypted based on the registration parameters. 

# Benefits

* None of the registered types will expose their encrypted details. The saved
objects with their unencrypted attributes could still be obtained and searched
on. The wrapper will follow all the security and spaces filtering of saved
objects so that only users with appropriate permissions will be able to obtain
the scrubbed objects or _save_ objects with encrypted attributes.

* No explicit access to a method that takes in an encrypted string exists. If the
type was not registered no decryption is possible. No need to handle the saved object
with the encrypted attributes reducing the risk of accidentally returning it in a
handler.

# Drawbacks

* It isn't possible to decrypt existing encrypted attributes once encryption key changes
* Possibly have a performance impact on Saved Objects API operations that require encryption/decryption
* Will require non trivial tests to test functionality along with spaces and security
* The attributes that are encrypted have to be defined and if they change they need to be migrated

# Out of scope

* Encryption key rotation mechanism, either regular or emergency
* Mechanism that would detect and warn when Kibana does not use keystore to store encryption key

# Alternatives

Only allow this to be used within the Actions service itself where the details
of the saved object are handled there directly. And the saved objects are
`hidden` but still use the security and spaces wrappers.

# Adoption strategy

Integration should be pretty easy which would include depending on the plugin, registering the desired saved object type
with it and defining encrypted attributes in the `mappings.json`.

# How we teach this

The `encrypted_saved_objects` as the name of the `thing` where it's seen as a separate
extension on top of the saved object service.

Provide a README.md in the plugin directory with the usage examples.

# Unresolved questions

* Is it acceptable to have this plugin in Basic?
* Are there any other use-cases that are not served with that interface?
* How would this work with Saved Objects Export\Import API?
* How would this work with migrations, if the attribute names wanted to be
  changed, a decrypt context would need to be created for migration?
