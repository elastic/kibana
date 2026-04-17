# @kbn/core-user-settings-server-internal

Contains the implementation and internal types of the server-side `userSettings` service.

## Overview

The `UserSettingsService` reads per-user settings from the user profile at render time so that they can be injected into the page metadata before the browser loads.

It exposes the following methods via its setup contract (`InternalUserSettingsServiceSetup`):

- `getUserSettingDarkMode(request)` — Returns the user's preferred dark mode value (`DarkModeValue | undefined`), used by the rendering service to determine the initial theme.
- `getUserSettingLocale(request)` — Returns the user's preferred locale (`string | undefined`), used by the rendering service to resolve the effective locale and build the correct translations URL for the current page load.

Both methods read from the `userSettings` data path of the authenticated user's profile via the `userProfile` core service.
