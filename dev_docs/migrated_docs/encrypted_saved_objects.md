---
id: kibDevDocsEncryptedSavedObjectsIntro
slug: /kibana-dev-docs/key-concepts/encrypted-saved-objects-intro
title: Encrypted Saved Objects
description: Configure your saved object types to secure sensitive data.
date: 2025-08-21
tags: ['kibana', 'dev', 'contributor', 'api docs']
---

Encrypted Saved Objects (ESO) protect sensitive data in [Saved Objects](/kibana-dev-docs/key-concepts/saved-objects-intro) through encryption.

## When to use ESOs

**Use ESOs for sensitive information**:
- Credentials (passwords, API keys, access keys)
- PII (SSNs, routing numbers, credit cards)  
- Secrets (private endpoints, tokens)

**Most saved objects don't need encryption.** Consult `@elastic/kibana-security` if unsure.

## Registration

First register your saved object type, then register it as encrypted:

```ts
// 1. Register saved object type
savedObjects.registerType({
  name: 'my_secure_type',
  // ... other config
});

// 2. Register as encrypted
encryptedSavedObjects.registerType({
  type: 'my_secure_type',
  attributesToEncrypt: new Set(['apiKey', 'password']),
  attributesToIncludeInAAD: new Set(['userId', 'createdAt']),
});
```

### Key concepts

**Encrypted attributes** - Sensitive data that gets encrypted
**AAD (Additional Authenticated Data)** - Unencrypted data used for decryption validation

**Decryption access levels**:
1. **Standard APIs** - Encrypted attributes removed from responses
2. **Internal APIs** - Use `getDecryptedAsInternalUser()` for internal access
3. **Exposed values** - Use `dangerouslyExposeValue: true` (evaluate carefully)

## AAD Guidelines

**Include in AAD** (never changes or relates to encrypted data):
- Created date/user
- Object configuration that relates to encrypted attributes
- Static identifiers

**Exclude from AAD** (can change independently):
- Display names, titles
- Optional/calculated fields
- Large data that slows encryption
- Attributes that might be refactored

> [!WARNING]
> **AAD constraints**: Cannot remove from AAD once included. Cannot add existing populated attributes to AAD.

## Partial updates

**Only allowed for**: Unencrypted, non-AAD attributes

**Requires full object update**: Any change to encrypted or AAD attributes

**Prevention pattern**:
```ts
type NonPartiallyUpdatable = 'encryptedField' | 'aadField';
type PartiallyUpdatable = Partial<Omit<MyObject, NonPartiallyUpdatable>>;
```

## Serverless considerations

**Zero Downtime Upgrades**: Both old/new Kibana versions run simultaneously

**AAD migration constraints**:
- Old version must decrypt new objects
- Changes affecting AAD need careful staging
- Some changes require 2-release approach

## Model versions

Use `createModelVersion` for changes affecting encrypted/AAD attributes:

```ts
const modelVersion = createModelVersion({
  modelVersion: myModelVersion,
  inputType: oldESORegistration,
  outputType: newESORegistration,
});
```

## Example

```ts
// Saved object registration
savedObjects.registerType({
  name: 'api_connector',
  // ... mappings, etc.
});

// ESO registration  
encryptedSavedObjects.registerType({
  type: 'api_connector',
  attributesToEncrypt: new Set(['apiKey']),
  attributesToIncludeInAAD: new Set(['connectorType', 'createdBy']),
});
```

## Resources

- **Development**: Uses static key automatically
- **Production**: Configure encryption key in kibana.yml
- **Security guide**: [Secure saved objects](https://www.elastic.co/guide/en/kibana/current/xpack-security-secure-saved-objects.html)
- **Examples**: [ESO Model Version example](https://github.com/elastic/kibana/blob/main/examples/eso_model_version_example/server/plugin.ts)
- **Help**: Contact `@elastic/kibana-security` on Slack (#kibana-security)