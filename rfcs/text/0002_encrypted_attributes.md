- Start Date: 2019-03-22
- RFC PR: (leave this empty)
- Kibana Issue: (leave this empty)

# Summary

In order to support the action service we need a way to encrypt/decrypt
attributes on saved objects that works with security and spaces filtering as
well as performing audit logging. Sufficiently hides the private key used and
removes encrypted attributes from being exposed through regular means.

# Basic example

Registering a type with the encryptedAttributes plugin

```JS
server.plugins.encryptedAttributes.registerType('action', ['secretParams']);
```

Retrieve a method that would receive the decrypted attributes.

```JS
const actionMethod = server.plugins.encryptedAttributes.buildDecryptionContext(id, type, (savedObject) => {
  const { username, password } = savedObject.secretsParams;
  ... // do integration with third party
});
... // later
actionMethod(); // retrieve, decrypt, and invoke above method
```

# Motivation

Main motivation is the storage and usage of third-party credentials for use with
the action service to do notifications. Also perform other types integrations,
call webhooks using tokens.

# Detailed design

In order for this to be in basic it needs to be done as a wrapper around the
saved object client. This can be added from a plugin in `x-pack`. In order to
use the plugin you would need to depend on it and register your saved object
type and the desired encrypted fields. The plugin would define its own
wrapper around the client that would encrypt the registered attributes and
remove any secret attributes on saved objects returned by the wrapped client.

```JS
server.plugins.encryptedAttributes.registerType('action', ['secretParams']);
```

If the wrapper gets a request to create, or update a registered type.

It would use the following procedure.
- extract and delete the registered encrypted attributes
- use the resulting id, type, and attributes as additional authentication data
  encrypt the extracted attributes.
- add the encrypted attributes back to the saved object and pass it to the
  wrapped client.

The secret attribute would be scrubbed from all get, bulkGet, and find
operations. Using the following procedure

- Forward call to wrapped client
- If no results or results blank return
- For each result
  - if the result type is a secret type
    - delete the encrypted attribute field
  - otherwise keep the results intacted

The wrapper will be injected for all saved object repositories.

## Benefits

None of the registered types will expose their encrypted details. The saved
objects with their unencrypted attributes could still be obtained and searched
on. The wrapper will follow all the security and spaces filtering of saved
objects so that only users with appropriate permissions will be able to obtain
the scrubbed objects or _save_ objects with encrypted attributes.

## Possible Problems

Consumers of scrubbed objects may try to modify them causing the encrypted
attributes to be dropped. But this could be prevented by disallowing updates
from the default saved objects client. And instead force all updates to go
through the plugin directly.

## Decrypting attributes

In order to get the resulting decrypted attributes back the plugin would require
a method be registered which would be passed the saved object including the
decrypted attributes then return an invokable method that would perform the
retrieval of the saved object the decryption and invoking of the desired method.

```JS
const actionMethod = server.plugins.encryptedAttributes.buildDecryptionContext(id, type, (savedObject) => {
  const { username, password } = savedObject.secretsParams;
  ... // do integration with third party
});
... // later
actionMethod(); // retrieve, decrypt, and invoke above method
```

## Benefits

No explicit access to a method that takes in an encrypted string exists. And no
access to the private key used is exposed through the plugin. If the type was not
registered no decryption is possible. No need to handle the saved object with
the encrypted attributes reducing the risk of accidentally returning it in a
handler.

# Drawbacks

- This would add the ability to encrypt data on any saved object in the system.
- Possibly add performance issues to retrieving saved objects.
- Might be complicated to test along with spaces and security
- Could be too complicated in general
- The attributes that are encrypted have to be defined and if they change they
  need to be migrated.

# Alternatives

Only allow this to be used within the Actions service itself where the details
of the saved object are handled there directly. And the saved objects are
`hidden` but still use the security and spaces wrappers.

# Adoption strategy

Integration should be pretty easy which would include depending on the plugin.
And registering the desired saved object type with it. And building and using
the desired decryption contexts.

# How we teach this

`encryptedAttributes` as the name of the `thing` where it's seen as a separate
extension on top of the saved object service.

Provide a readme.md in the plugin directory with examples for how to depend on
the plugin and define a type has hidden attributes.

# Unresolved questions

- Is `encryptedAttributes` an acceptable name for the plugin
- Is building a method that receives the object with the decrypted attributes
  make sense?
- Are there other use-cases that are not served with that interface?
- How would this work with migrations, if the attribute names wanted to be
  changed, a decrypt context would need to be created for migration.
