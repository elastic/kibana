# Copilot Code Review Instructions: Encrypted Saved Objects (ESO)

## Purpose
These instructions are for Copilot code reviews of Pull Requests (PRs) that introduce or modify Encrypted Saved Object (ESO) type registrations in the codebase.


## What Fields Are Sensitive?

When reviewing encrypted saved object registrations, treat the following types of fields as sensitive and ensure they are included in `attributesToEncrypt`:
- Passwords and passphrases
- Access tokens, API keys, and secret keys
- Personally identifiable information (PII), such as:
  - Full name 
  - Social Security Number (SSN) 
  - Driver's license number 
  - Passport number 
  - Biometric records (e.g., fingerprints, facial recognition)
  - Date of birth
  - Home address
  - Email address
  - Phone number 
  - Mother's maiden name
  - Financial information, such as credit card numbers or bank account numbers 
  - Medical records 
  - Genetic information 
  - Employment information 
- Private cryptographic keys or certificates
- Any field that could be used to impersonate a user or gain unauthorized access

If you are unsure whether a field is sensitive, flag it for manual review.

## What to Look For


### 1. Identify All ESO Type Registrations
- **Locate all code changes** where a new encrypted saved object type is registered, or where an existing registration is modified.
- Registration is performed by calling the function defined in `x-pack/platform/plugins/shared/encrypted_saved_objects/server/plugin.ts` (see `registerType` of the `EncryptedSavedObjectsPluginSetup` interface).
- Calls to this function (e.g., `encryptedSavedObjects.registerType({ ... })`) help identify changes where new types are registered or existing registrations are changed.
- Example (see `x-pack/platform/plugins/shared/actions/server/saved_objects/index.ts`):
  ```typescript
  encryptedSavedObjects.registerType({
    type: 'my_saved_object_type',
    attributesToEncrypt: new Set(['secretField']),
    attributesToIncludeInAAD: new Set(['nonSecretField']),
  });
  ```
- For each identified code change, remember the file path and applicable line number.

### 2. Identify Corresponding Saved Object Type Model Version Changes
- For each encrypted saved object type registration identified above, also check for changes to the corresponding saved object type registration.
- The saved object type registration function is defined in `src/core/packages/saved-objects/server/src/contracts.ts` as part of the `SavedObjectsServiceSetup` interface.
- Specifically, look for changes to the `modelVersions` property of the `SavedObjectsType` object for the same `type` as registered with `EncryptedSavedObjectsPluginSetup.registerType`.
- If any model version changes are present for a matching type, include the file path and line number, and summarize the nature of the change (e.g., new version added, migration modified, etc.).

### 2. For Each Registration or Change, Check:
- **Type Name**: Is the `type` property consistent with the saved object definition?
- **Attributes to Encrypt**: Are all sensitive fields included in `attributesToEncrypt`? Is `dangerouslyExposeValue` true for any of the listed attributes?
- **AAD Attributes**: Are all necessary fields included in `attributesToIncludeInAAD`? Are there any sensitive fields that should be included in `attributesToEncrypt` instead?
- **Registration Location**: Is the registration in the correct setup/init location for the relevant plugin/module?
- **Modifications**: If an existing registration is changed, what fields or options were added, removed, or altered?

### 3. Flag and Summarize
- **List all new or changed ESO registrations** in the PR, with file and line references.
- **Summarize the nature of each change** (e.g., new type, added encrypted attribute, changed AAD fields, etc.).
- **Flag any potential issues** (e.g., missing sensitive fields, accidental exposure in AAD, registration in the wrong place).

## Example Review Output
- `x-pack/platform/plugins/shared/actions/server/saved_objects/index.ts:75` — Registered new ESO type `ACTION_SAVED_OBJECT_TYPE` with encrypted attribute `secrets` and AAD attributes `actionTypeId`, `isMissingSecrets`, `config`.
- `x-pack/plugins/xyz/server/abc.ts:120` — Modified ESO registration: added `apiKey` to `attributesToEncrypt`.
- **Potential Issue**: Field `password` is not included in `attributesToEncrypt` for type `my_type`.

## Additional Guidance
- Only review changes to ESO registrations, not general saved object registrations.
- If unsure about a field's sensitivity, flag it for manual review.

---

**End of Copilot Code Review Instructions for Encrypted Saved Objects**
