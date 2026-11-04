---
name: encrypted-saved-objects
description: Encrypted Saved Objects (ESO) in Kibana — registration, AAD attribute choices, partial update safety, model version migrations with createModelVersion, canEncrypt checks, and Serverless constraints. Use when creating, modifying, or working with ESO types.
---

# Encrypted Saved Objects (ESO)

> **Sensitive Data Protection:** Encrypted Saved Objects protect credentials, API keys, PII, and other secrets stored in Kibana. Incorrect ESO changes can make objects permanently undecryptable.

## Overview

An Encrypted Saved Object (ESO) is a Saved Object type registered with the ESO Service to specify:
- **`attributesToEncrypt`**: Attributes containing sensitive data (encrypted at rest)
- **`attributesToIncludeInAAD`**: Attributes used as Additional Authenticated Data (bound to the encrypted data, must match exactly during decryption)

The ESO Service encrypts using the `xpack.encryptedSavedObjects.encryptionKey` Kibana config setting. In development, a static key is auto-configured.

**Definitive reference:** `dev_docs/key_concepts/encrypted_saved_objects.mdx`

## When to Use ESOs

Only register a Saved Object type as encrypted if it stores genuinely sensitive data:
- Credentials: passwords, API keys, access keys, tokens
- PII: social security numbers, credit card numbers, bank routing numbers
- Other secrets: private endpoints, signing keys, certificates

Most Saved Object types do **not** need encryption. When in doubt, consult `#kibana-security`.

## Registration

### Step 1: Register the Saved Object type with Core

```ts
savedObjects.registerType({
  name: 'my_encrypted_type',
  hidden: true,
  namespaceType: 'multiple-isolated',
  mappings: { /* ... */ },
  modelVersions: myModelVersions,
});
```

### Step 2: Register with the ESO Service

```ts
encryptedSavedObjects.registerType({
  type: 'my_encrypted_type', // must match the Core registration name
  attributesToEncrypt: new Set(['secrets']),
  attributesToIncludeInAAD: new Set(['connectorType', 'createdAt']),
});
```

**Key rules:**
- The `type` string must exactly match the name used in Core's `savedObjects.registerType`
- `attributesToEncrypt` must not be empty
- Use `{ key: 'fieldName', dangerouslyExposeValue: true }` only when decrypted values must be exposed through standard SO client APIs (e.g. `get`, `find`); this requires thorough justification and documentation

### Choosing `attributesToEncrypt`

Encrypt any attribute containing sensitive data. By default, encrypted attributes are **stripped** from responses when accessed via standard Saved Object Client APIs (get, find, etc.). To access decrypted values, use the dedicated ESO Client APIs (`getDecryptedAsInternalUser`, `createPointInTimeFinderDecryptedAsInternalUser`).

### Choosing `attributesToIncludeInAAD`

AAD attributes are **not encrypted** but are cryptographically bound to the encrypted data. If any AAD attribute changes, all encrypted attributes must be re-encrypted.

**INCLUDE in AAD** — attributes that:
- Are associated with or describe the encrypted data (e.g., connector type, token type, URL)
- Never change after creation (e.g., `createdAt`, `createdBy`, type identifiers)

**EXCLUDE from AAD** — attributes that:
- Are present in `attributesToEncrypt`
- Can be changed by end users independently of encrypted data (e.g., display name, UI settings)
- May be optional, absent, or calculated (e.g., statistics, `updatedAt`)
- May be removed or refactored in the future (deprecated or experimental fields)
- Contain large data that would slow encryption/decryption in bulk operations

**Be conservative:** only include attributes the team is 100% confident should be included. Adding an existing populated attribute to AAD later is **not supported** in Serverless.

**Nested attributes:** `attributesToEncrypt` and `attributesToIncludeInAAD` accept **top-level attribute names only**. Names are matched against the keys of `attributes` with an exact string comparison — a dot is never interpreted as a path, and nothing traverses into subfields. When an attribute is included in AAD, all of its subfields are inherently included, so cover nested data by naming the top-level attribute that contains it; if only part of an attribute belongs in AAD, restructure the object so that part becomes top-level.

**Enforcement: registering a dotted attribute key throws.** `EncryptedSavedObjectAttributesDefinition` rejects dotted keys in both sets at registration time. The message names the offending set and lists every key in it:

```
Invalid EncryptedSavedObjectTypeRegistration for type 'my_type'. Attribute keys are matched as flat top-level attribute names, not as nested paths. These dotted attributesToEncrypt keys are not permitted to prevent misuse: auth.apiKey.
```

This is a runtime check, not a lint rule — there is no comment or config that disables it. Because it runs on the fully resolved sets, it catches keys arriving via enum members, imported constants and spreads. The one gap: a type behind a disabled config never registers, so it is never checked.

**Why it throws rather than warns.** Without the check, a dotted key fails silently in the worst possible way:
- In `attributesToEncrypt` it matches nothing — the secret is stored **in plaintext** and, because stripping uses the same names, is **not stripped** from `get`/`find` responses. The only signal is a debug-level log.
- In `attributesToIncludeInAAD` it is silently dropped from AAD, weakening the integrity binding of the encrypted attributes while encryption and decryption both still succeed.
- Contrast with Core: a model version `data_removal` change's `removedAttributePaths: ['auth.apiKey']` *does* resolve nested paths, but `attributesToEncrypt: ['auth.apiKey']` does not. The two look identical; only one works.

**The only exception is a grandfathered allowlist.** `synthetics-monitor` and `synthetics-monitor-multi-space` genuinely use flat top-level names containing dots, matching the heartbeat config key format (`'service.name'`, `'url.port'`, `'ssl.key'`). Their keys are enumerated in `TYPES_WITH_DOTTED_ATTRIBUTE_KEYS` in the ESO plugin — spelled out per key rather than prefix-matched, and not shared between types, so a new dotted key is rejected even under an already-permitted prefix. **Do not add to this list.** It exists to grandfather in types that predate the check and should only ever shrink; a type that appears to need a new dotted key needs the Kibana Security team, not an allowlist entry.

## Partial Update Safety

**Critical:** Partial updates (`savedObjectsClient.update` or `savedObjectsRepository.update`) on ESOs must **never** modify encrypted attributes or AAD-included attributes. Doing so corrupts the object, making it permanently undecryptable.

**Required pattern:** Create a type-safe partial update helper that strips encrypted and AAD attributes:

```ts
export const MyTypeAttributesToEncrypt = ['secrets'];
export const MyTypeAttributesIncludedInAAD = ['connectorType', 'createdAt'];
export type MyTypeAttributesNotPartiallyUpdatable = 'secrets' | 'connectorType' | 'createdAt';

export type PartiallyUpdateableMyTypeAttributes = Partial<
  Omit<MyTypeSO, MyTypeAttributesNotPartiallyUpdatable>
>;

export async function partiallyUpdateMyType(
  savedObjectsClient: Pick<SavedObjectsClient, 'update'>,
  id: string,
  attributes: PartiallyUpdateableMyTypeAttributes,
  options: SavedObjectsUpdateOptions = {}
): Promise<void> {
  const safeAttributes = omit(attributes, [
    ...MyTypeAttributesToEncrypt,
    ...MyTypeAttributesIncludedInAAD,
  ]);
  await savedObjectsClient.update('my_encrypted_type', id, safeAttributes, options);
}
```

Any code that calls `savedObjectsClient.update` or `savedObjectsRepository.update` on an ESO type must verify that encrypted and AAD attributes are excluded from the update payload.

## Accessing Decrypted Data

### ESO Client APIs (server-side only)

Use the dedicated ESO Client for accessing decrypted attributes. These run as the internal Kibana user and should **not** expose secrets to end users unless absolutely necessary:

```ts
// Single object
const decrypted = await encryptedSavedObjectsClient.getDecryptedAsInternalUser<MyType>(
  'my_encrypted_type',
  objectId,
  { namespace }
);

// Bulk find with decryption
const finder = await encryptedSavedObjectsClient
  .createPointInTimeFinderDecryptedAsInternalUser<MyType>({
    type: 'my_encrypted_type',
    perPage: 100,
  });
```

Decrypted values should not be returned directly in HTTP responses without explicit justification. Calling `getDecryptedAsInternalUser` with a type that is not registered as encrypted throws at runtime.

## Graceful Degradation with `canEncrypt`

The ESO encryption key is optional. Plugins must check `canEncrypt` and handle the case where encryption is unavailable:

```ts
// Setup phase: store the canEncrypt flag
const canEncrypt = plugins.encryptedSavedObjects.canEncrypt;

// Runtime: degrade gracefully or reject operations
if (!canEncrypt) {
  // Option 1: Reject the operation with a clear error
  throw new Error('Encryption key is not configured. Cannot create encrypted objects.');

  // Option 2: Degrade gracefully (e.g., skip encryption-dependent features)
  logger.warn('Encryption key not set. Feature X is unavailable.');
}
```

Any plugin that uses ESO features (registers types, calls `getDecryptedAsInternalUser`, etc.) without checking `canEncrypt` or handling the absence of an encryption key has a bug.

## Model Version Migrations

When an ESO type's encrypted attributes or AAD-included attributes change, use `createModelVersion` to wrap the model version definition with automatic decryption/re-encryption:

```ts
import type { EncryptedSavedObjectTypeRegistration } from '@kbn/encrypted-saved-objects-plugin/server';

// Previous version's registration (for decryption)
const inputType: EncryptedSavedObjectTypeRegistration = {
  type: 'my_encrypted_type',
  attributesToEncrypt: new Set(['secrets']),
  attributesToIncludeInAAD: new Set(['connectorType']),
};

// New version's registration (for re-encryption)
const outputType: EncryptedSavedObjectTypeRegistration = {
  type: 'my_encrypted_type',
  attributesToEncrypt: new Set(['secrets']),
  attributesToIncludeInAAD: new Set(['connectorType', 'createdAt']),
};

// In the Saved Object type registration:
modelVersions: {
  2: plugins.encryptedSavedObjects.createModelVersion({
    modelVersion: {
      changes: [
        {
          type: 'data_backfill',
          backfillFn: (doc) => ({
            attributes: { createdAt: doc.attributes.createdAt ?? new Date().toISOString() },
          }),
        },
      ],
      schemas: {
        forwardCompatibility: mySchemaV2.extends({}, { unknowns: 'ignore' }),
        create: mySchemaV2,
      },
    },
    inputType,
    outputType,
    shouldTransformIfDecryptionFails: true, // optional: proceed even if decryption fails
  }),
},
```

**Key rules:**
- `createModelVersion` requires at least one change in the `changes` array
- `inputType` must match the ESO registration from the **previous** model version
- `outputType` must match the ESO registration for the **new** model version
- All transform functions (`unsafe_transform`, `data_backfill`, `data_removal`) are merged into a single decrypt-transform-encrypt pass
- `createModelVersion` is **only** needed when encrypted or AAD attributes change; purely unencrypted, non-AAD changes can use standard model versions

**Reference implementation:** `examples/eso_model_version_example/server/plugin.ts`

## Serverless Considerations (Zero Downtime Upgrades)

In Serverless, both the current and previous Kibana versions may run simultaneously. The previous version must be able to decrypt ESOs migrated by the new version **without knowledge of the new model version**.

### Critical constraints

- **Cannot add an existing populated attribute to AAD.** The previous version will never successfully decrypt because it does not include the attribute in its AAD construction.
- **Cannot remove an attribute from AAD.** The previous version will always include it in AAD construction, causing decryption to fail.
- **Cannot change an attribute from unencrypted to encrypted.** The previous version will not attempt decryption.
- **Cannot change an attribute from encrypted to unencrypted.** The previous version will always attempt decryption.

### Multi-stage release patterns

Some changes require **2 Serverless releases**:

**Adding a new AAD attribute:**
1. **Release 1:** Add the attribute to `attributesToIncludeInAAD` in the registration. Do NOT populate or use the attribute yet.
2. **Release 2:** Implement a model version with `createModelVersion` to backfill and start using the attribute.

**Removing an attribute (when previous version depends on it):**
1. **Release 1:** Update all business logic to handle the type without the attribute.
2. **Release 2:** Implement a model version to remove the attribute.

### `forwardCompatibility` schema

Set `unknowns: 'ignore'` in the `forwardCompatibility` schema when the previous version should drop unknown fields. This is helpful if the additional fields are not compatible or problematic in the previous version.

During model version transformation, decryption occurs BEFORE the `forwardCompatibility` schema is applied. This supports the fact that an AAD attribute covers all of its subfields — when subfields of an AAD attribute are added or removed, the previous version can still successfully construct AAD, ensuring objects can be decrypted before being adapted for the previous version.

## Quick Change Reference

| Change | Encrypted? | In AAD? | Needs `createModelVersion`? | Serverless stages |
|--------|-----------|---------|----------------------------|-------------------|
| Add new attribute | No | No | No | 1 (with `forwardCompatibility` if needed) |
| Add new attribute | No | Yes | Yes | **2** |
| Add new attribute | Yes | N/A | Yes | 1 (with `forwardCompatibility` if needed) |
| Remove attribute | No | No | No | 1-2 depending on business logic |
| Remove attribute | No | Yes | Yes | 1-2 depending on business logic |
| Remove attribute | Yes | N/A | No | 1-2 depending on business logic |
| Modify attribute (add/remove subfield) | No | No | No | 1-2 depending on business logic |
| Modify attribute (add/remove subfield) | No | Yes | Yes | 1-2 depending on business logic |
| Modify attribute (add/remove subfield) | Yes | N/A | Yes | 1-2 depending on business logic |
| Add existing attribute to AAD | No | No->Yes | **Not supported** | N/A |
| Remove attribute from AAD | No | Yes->No | **Not supported** | N/A |
| Change unencrypted to encrypted | No->Yes | Any | **Not supported** | N/A |
| Change encrypted to unencrypted | Yes->No | N/A | **Not supported** | N/A |

## Checklist

When working with ESO-related code, verify:

1. **Registration correctness**
   - [ ] `type` matches the Core Saved Object registration name
   - [ ] `attributesToEncrypt` contains only genuinely sensitive attributes
   - [ ] `attributesToIncludeInAAD` follows the inclusion/exclusion guidelines above
   - [ ] `attributesToEncrypt` and `attributesToIncludeInAAD` contain top-level attribute names only — no dotted keys (registration throws; only the grandfathered synthetics monitor keys are exempt, and that list must not grow)
   - [ ] `dangerouslyExposeValue` is only used with documented justification

2. **Partial update safety**
   - [ ] No `savedObjectsClient.update` calls modify encrypted or AAD attributes
   - [ ] A type-safe partial update helper exists that strips unsafe attributes
   - [ ] The `NotPartiallyUpdatable` type is kept in sync with the ESO registration

3. **Model version migrations**
   - [ ] `createModelVersion` is used when encrypted or AAD attributes change
   - [ ] `inputType` matches the previous version's ESO registration
   - [ ] `outputType` matches the new version's ESO registration
   - [ ] `forwardCompatibility` schema is set with `unknowns: 'ignore'` when appropriate

4. **Serverless compatibility**
   - [ ] Changes do not add existing populated attributes to AAD
   - [ ] Changes do not remove attributes from AAD
   - [ ] Multi-stage releases are used when required (see table above)
   - [ ] Business logic handles objects with or without new/removed attributes

5. **Encryption availability**
   - [ ] `canEncrypt` is checked before using ESO-dependent features
   - [ ] Graceful degradation or clear error when encryption is unavailable

6. **Secret exposure**
   - [ ] Decrypted values from `getDecryptedAsInternalUser` are consumed internally, not exposed in API responses
   - [ ] Any exposure of decrypted values is explicitly justified and documented

## References

- [Encrypted Saved Objects dev docs](dev_docs/key_concepts/encrypted_saved_objects.mdx)
- [Secure Saved Objects (Elastic docs)](https://www.elastic.co/guide/en/kibana/current/xpack-security-secure-saved-objects.html)
- [Model Versions tutorial](dev_docs/tutorials/saved_objects.mdx)
- [ESO Model Version example plugin](examples/eso_model_version_example/server/plugin.ts)
- ESO plugin source: `x-pack/platform/plugins/shared/encrypted_saved_objects/`
