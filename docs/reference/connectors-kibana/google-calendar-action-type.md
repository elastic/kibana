---
navigation_title: "Google Calendar"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/google-calendar-action-type.html
applies_to:
  stack: preview 9.4
  serverless: preview
---

# Google Calendar connector [google-calendar-action-type]

The Google Calendar connector enables searching and accessing events and calendars in Google Calendar.

## Create connectors in {{kib}} [define-google-calendar-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [google-calendar-connector-configuration]

Google Calendar connectors have the following configuration properties:

Bearer Token
:   A Google OAuth 2.0 access token with Google Calendar API scopes. Check the [Get API credentials](#google-calendar-api-credentials) section for instructions.

## Test connectors [google-calendar-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}. The test verifies connectivity by fetching the authenticated user's calendar list from the Google Calendar API.

The Google Calendar connector has the following actions:

Search events
:   Search for events in Google Calendar by keywords. Matches against event summary, description, location, and attendee names.
    - **query** (required): Free text search terms to find events (e.g., "team standup", "budget review", "John Smith").
    - **calendarId** (optional): Calendar ID to search. Use `primary` for the user's primary calendar. Defaults to `primary`.
    - **timeMin** (optional): Lower bound (inclusive) for event start time as an RFC3339 timestamp (e.g., `2024-01-01T00:00:00Z`).
    - **timeMax** (optional): Upper bound (exclusive) for event start time as an RFC3339 timestamp (e.g., `2024-12-31T23:59:59Z`).
    - **maxResults** (optional): Maximum number of events to return (1–2500). Defaults to 50.

Get event
:   Retrieve full details of a specific event by its ID, including recurrence info, conference links, and attachments.
    - **eventId** (required): The ID of the event to retrieve.
    - **calendarId** (optional): Calendar ID containing the event. Use `primary` for the user's primary calendar. Defaults to `primary`.

List calendars
:   List all calendars accessible to the authenticated user, including calendar ID, name, description, access role, and time zone.
    - **pageToken** (optional): Pagination token from a previous response.

List events
:   List events from a calendar, optionally filtered by time range.
    - **calendarId** (optional): Calendar ID to list events from. Use `primary` for the user's primary calendar. Defaults to `primary`.
    - **timeMin** (optional): Lower bound (inclusive) for event start time as an RFC3339 timestamp.
    - **timeMax** (optional): Upper bound (exclusive) for event start time as an RFC3339 timestamp.
    - **maxResults** (optional): Maximum number of events to return (1–2500). Defaults to 50.
    - **pageToken** (optional): Pagination token from a previous response.
    - **orderBy** (optional): Sort order: `startTime` (chronological, default) or `updated` (last modification time).

## Connector networking configuration [google-calendar-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking configurations, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [google-calendar-api-credentials]

To use the Google Calendar connector, you need a Google OAuth 2.0 access token with Calendar API scopes. You can obtain one using the [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/):

1. Open the [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/).
2. In the list of APIs, select **Calendar API v3** and choose the `https://www.googleapis.com/auth/calendar.readonly` scope (or `https://www.googleapis.com/auth/calendar` for full access).
3. Click **Authorize APIs** and sign in with your Google account.
4. Click **Exchange authorization code for tokens**.
5. Copy the **Access token** and use it as the **Bearer Token** in the connector configuration.

:::{note}
OAuth 2.0 Playground tokens expire after 1 hour. For production use, implement a proper OAuth 2.0 flow with token refresh. See the [Google Identity documentation](https://developers.google.com/identity/protocols/oauth2) for details.
:::
