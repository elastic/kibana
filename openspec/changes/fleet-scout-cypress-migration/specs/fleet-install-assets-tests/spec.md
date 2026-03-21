# Spec: Fleet Install Assets Tests

## ADDED Requirements

### Requirement: Unverified package force-install modal

The system SHALL display a force-install modal when a user attempts to install assets from an unverified package. The modal SHALL allow the user to proceed with "Install anyway", and the subsequent install request SHALL include `force: true`.

#### Scenario: Force install modal for unverified package

- **WHEN** a user navigates to an unverified package settings page and clicks "Install assets"
- **AND** the install request would fail without force
- **THEN** a modal appears prompting to install anyway (unverified package warning)
- **AND** when the user clicks "Install anyway", the install request is sent with `force: true`
- **AND** the install succeeds when force is applied

#### Scenario: First install attempt returns verification error

- **WHEN** the package is unverified and the user triggers install without force
- **THEN** the API returns a verification_failed error
- **AND** the force-install modal is shown
- **AND** after confirming, the retry request includes `force: true`

---

### Requirement: Integration with ML and transforms

The system SHALL support integration packages that include ML and transforms assets. Tests SHALL verify that the assets integration flow works when packages have ML modules and transform configurations.

#### Scenario: Install assets with ML and transforms

- **WHEN** a user installs assets for a package that includes ML and/or transform configurations
- **THEN** the install flow completes successfully
- **AND** ML assets and transforms are provisioned as expected
