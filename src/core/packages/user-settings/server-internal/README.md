# @kbn/core-user-settings-server-internal

Contains the implementation and internal types of the server-side `userSettings` service.

## Overview

The `UserSettingsService` reads per-user settings from the user profile at render time so that they can be injected into the page metadata before the browser loads.

It exposes the following methods via its setup contract (`InternalUserSettingsServiceSetup`):

- `getUserSettingDarkMode(request)` — Returns the user's preferred dark mode value (`DarkModeValue | undefined`), used by the rendering service to determine the initial theme.
- `getUserSettingLocale(request)` — Returns the user's preferred locale (`string | undefined`), used by the rendering service to inject `userLocale` into the page metadata so the browser can load the correct translation bundle.

Both methods read from the `userSettings` data path of the authenticated user's profile via the `userProfile` core service.
