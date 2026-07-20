---
description: Ownership audit for Kibana global advanced settings.
---

# Global Advanced Settings Ownership

This audit lists production global advanced settings registered through `uiSettings.registerGlobal` that are displayed in the Advanced Settings UI. Team owners come from the owning module's `kibana.jsonc` metadata. Test-only registrations and UI-hidden internal settings marked as `readonly` are excluded.

| Global advanced setting | Setting ID | Team owner(s) | Owning module |
| --- | --- | --- | --- |
| Alerting V2 | `alerting:v2:enabled` | `@elastic/rna-project-team` | `@kbn/alerting-v2-plugin` |
| Custom logo | `xpackCustomBranding:logo` | `@elastic/appex-sharedux` | `@kbn/custom-branding-plugin` |
| Favicon (PNG) | `xpackCustomBranding:faviconPNG` | `@elastic/appex-sharedux` | `@kbn/custom-branding-plugin` |
| Favicon (SVG) | `xpackCustomBranding:faviconSVG` | `@elastic/appex-sharedux` | `@kbn/custom-branding-plugin` |
| Hide announcements | `hideAnnouncements` | `@elastic/appex-sharedux` | `@kbn/core-ui-settings-server-internal` |
| Organization name | `xpackCustomBranding:customizedLogo` | `@elastic/appex-sharedux` | `@kbn/custom-branding-plugin` |
| Page title | `xpackCustomBranding:pageTitle` | `@elastic/appex-sharedux` | `@kbn/custom-branding-plugin` |
