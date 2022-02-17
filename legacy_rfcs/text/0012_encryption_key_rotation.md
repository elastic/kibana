- Start Date: 2020-07-22
- RFC PR: [#72828](https://github.com/elastic/kibana/pull/72828)
- Kibana Issue: (leave this empty)

# Summary

This RFC proposes a way of the encryption key (`xpack.encryptedSavedObjects.encryptionKey`) rotation that would allow administrators to seamlessly change existing encryption key without any data loss and manual intervention.

# Basic example

When administrators decide to rotate encryption key they will have to generate a new one and move the old key(s) to the `keyRotation` section in the `kibana.yml`:

```yaml
xpack.encryptedSavedObjects:
  encryptionKey: "NEW-encryption-key"
  keyRotation:
    decryptionOnlyKeys: ["OLD-encryption-key-1", "OLD-encryption-key-2"]
```

Before old decryption-only key is disposed administrators may want to call a dedicated and _protected_ API endpoint that will go through all registered Saved Objects with encrypted attributes and try to re-encrypt them with the primary encryption key:

```http request
POST https://localhost:5601/api/encrypted_saved_objects/rotate_key?conflicts=abort
Content-Type: application/json
Kbn-Xsrf: true
```

# Motivation

Today when encryption key changes we can no longer decrypt Saved Objects attributes that were previously encrypted with the `EncryptedSavedObjects` plugin. We handle this case in two different ways depending on whether consumers explicitly requested decryption or not:

* If consumers explicitly request decryption via  `getDecryptedAsInternalUser()` we abort operation and throw exception.
* If consumers fetch Saved Objects with encrypted attributes that should be automatically decrypted (the ones with `dangerouslyExposeValue: true` marker) via standard Saved Objects APIs we don't abort operation, but rather strip all encrypted attributes from the response and record decryption error in the `error` Saved Object field.
* If Kibana tries to migrate encrypted Saved Objects at the start up time we abort operation and throw exception. 

In both of these cases we throw or record error with the specific type to allow consumers to gracefully handle this scenario and either drop Saved Objects with unrecoverable encrypted attributes or facilitate the process of re-entering and re-encryption of the new values.

This approach works reasonably well in some scenarios, but it may become very troublesome if we have to deal with lots of Saved Objects. Moreover, we'd like to recommend our users to periodically rotate encryption keys even if they aren't compromised. Hence, we need to provide a way of seamless migration of the existing encrypted Saved Objects to a new encryption key.

There are two main scenarios we'd like to cover in this RFC:

## Encryption key is not available

Administrators may lose existing encryption key or explicitly decide to not use it if it was compromised and users can no longer trust encrypted content that may have been tampered with. In this scenario encrypted portion of the existing Saved Objects is considered lost, and the only way to recover from this state is a manual intervention described previously. That means `EncryptedSavedObjects` plugin consumers __should__ continue supporting this scenario even after we implement a proper encryption key rotation mechanism described in this RFC.

## Encryption key is available, but needs to be rotated

In this scenario a new encryption key (primary encryption key) will be generated, and we will use it to encrypt new or updated Saved Objects. We will still need to know the old encryption key to decrypt existing attributes, but we will no longer use this key to encrypt any of the new or existing Saved Objects. It's also should be possible to have multiple old decryption-only keys.

The old old decryption-only keys should be eventually disposed and users should have a way to make sure all existing Saved Objects are re-encrypted with the new primary encryption key.

__NOTE:__ users can get into a state when different Saved Objects are encrypted with different encryption keys even if they didn't intend to rotate the encryption key. We anticipate that it can happen during initial Elastic Stack HA setup, when by mistake or intentionally different Kibana instances were using different encryption keys. Key rotation mechanism can help to fix this issue without a data loss.

# Detailed design

The core idea is that when the encryption key needs to be rotated then a new key is generated and becomes a primary one, and the old one moves to the `keyRotation` section:

```yaml
xpack.encryptedSavedObjects:
  encryptionKey: "NEW-encryption-key"
  keyRotation:
    decryptionOnlyKeys: ["OLD-encryption-key"]
```

As the name implies, the key from the `decryptionOnlyKeys` is only used to decrypt content that we cannot decrypt with the primary encryption key. It's allowed to have multiple decryption-only keys at the same time. When user creates a new Saved Object or updates the existing one then its content is always encrypted with the primary encryption key. Config schema won't allow having the same key in `encryptionKey` and `decryptionOnlyKeys`.

Having multiple decryption keys at the same time brings one problem though: we need to figure out which key to use to decrypt specific Saved Object. If our encryption keys could have a unique ID that we would store together with the encrypted data (we cannot use encryption key hash for that for obvious reasons) we could know for sure which key to use, but we don't have such functionality right now and it may not be the easiest one to manage through `yml` configuration anyway. 

Instead, this RFC proposes to try available existing decryption keys one by one to decrypt Saved Object and always start from the primary one. This way we won't incur any penalty while decrypting Saved Objects that are already encrypted with the primary encryption key, but there will still be some cost when we have to perform multiple decryption attempts. See the [`Drawbacks`](#drawbacks) section for the details.

Technically just having `decryptionOnlyKeys` would be enough to cover the majority of the use cases, but the old decryption-only keys should be eventually disposed. At this point administrators would like to make sure _all_ Saved Objects are encrypted with the new primary encryption key. Another reason to re-encrypt all existing Saved Objects with the new key at once is to preventively reduce the performance impact of the multiple decryption attempts.

We'd like to make this process as simple as possible while meeting the following requirements:

* It should not be required to restart Kibana to perform this type of migration since Saved Objects encrypted with the another encryption key can theoretically appear at any point in time.
* It should be possible to integrate this operation into other operational flows our users may have and any user-friendly key management UIs we may introduce in this future.
* Any possible failures that may happen during this operation shouldn't make Kibana nonfunctional.
* Ordinary users should not be able to trigger this migration since it may consume a considerable amount of computing resources.

We think that the best option we have right now is a dedicated API endpoint that would trigger this migration:

```http request
POST https://localhost:5601/api/encrypted_saved_objects/rotate_key?conflicts=abort
Content-Type: application/json
Kbn-Xsrf: true
```

This will be a protected endpoint and only user with enough privileges will be able to use it.

Under the hood we'll scroll over all Saved Objects that are registered with `EncryptedSavedObjects` plugin and re-encrypt attributes only for those of them that can only be decrypted with any of the old decryption-only keys. Saved Objects that can be decrypted with the primary encryption key will be ignored. We'll also ignore the ones that cannot be decrypted with any of the available decryption keys at all, and presumably return their IDs in the response.

As for any other encryption or decryption operation we'll record relevant bits in the audit logs.

# Benefits

* The concept of decryption-only keys is easy to grasp and allows Kibana to function even if it has a mix of Saved Objects encrypted with different encryption keys.
* Support of the key rotation out of the box decreases the chances of the data loss and makes `EncryptedSavedObjects` story more secure and approachable overall.

# Drawbacks

* Multiple decryption attempts affect performance. See [the performance test results](https://github.com/elastic/kibana/pull/72420#issue-453400211) for more details, but making two decryption attempts is basically twice as slow as with a single attempt. Although it's only relevant for the encrypted Saved Objects migration performed at the start up time and batch operations that trigger automatic decryption (only for the Saved Objects registered with `dangerouslyExposeValue: true` marker that nobody is using in Kibana right now), we may have more use cases in the future.
* Historically we supported Kibana features with either configuration or dedicated UI, but in this case we want to introduce an API endpoint that _should be_ used directly. We may have a key management UI in the future though.

# Alternatives

We cannot think of any better alternative for `decryptionOnlyKeys` at the moment, but instead of API endpoint for the batch re-encryption we could potentially use another `kibana.yml` config option. For example `keyRotation.mode: onWrite | onStart | both`, but it feels a bit hacky and cannot be really integrated with anything else.

# Adoption strategy

Adoption strategy is pretty straightforward since the feature is an enhancement and doesn't bring any BWC concerns.

# How we teach this

Key rotation is a well-known paradigm. We'll update `README.md` of the `EncryptedSavedObjects` plugin and create a dedicated section in the public Kibana documentation.

# Unresolved questions

* Is it reasonable to have this feature in Basic?
* Are there any other use-cases that are not covered by the proposal?
