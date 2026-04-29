---
navigation_title: "Google Calendar"
type: reference
description: "Use the Google Calendar connector to search and access events and calendars in Google Calendar."
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
:   A Google OAuth 2.0 access token with Google Calendar API scopes. See **Get API credentials**.

OAuth 2.0 authorization code
:   Uses a **Web application** OAuth client in Google Cloud. In {{kib}} you provide:

    - **Client ID** and **Client Secret**: from that OAuth client
    - **Redirect URI**: register {{kib}}’s OAuth callback in Google Cloud (see **Get API credentials**)

    The connector automatically uses the correct Google OAuth endpoints and scope (`https://www.googleapis.com/auth/calendar.readonly`).

## Test connectors [google-calendar-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}. The test verifies connectivity by fetching the authenticated user's calendar list from the Google Calendar API.

The Google Calendar connector has the following actions:

Search events
:   Search for events in Google Calendar by keywords. Matches against event summary, description, location, and attendee names.
    - `query` (required): Free text search terms to find events (for example, `team standup`, `budget review`, `John Smith`).
    - `calendarId` (optional): Calendar ID to search. Use `primary` for the user's primary calendar, a specific calendar ID from list calendars, or a person's email address to access their calendar. Defaults to `primary`.
    - `timeMin` (optional): Lower bound (inclusive) for event start time as an RFC3339 timestamp (for example, `2024-01-01T00:00:00Z`).
    - `timeMax` (optional): Upper bound (exclusive) for event start time as an RFC3339 timestamp (for example, `2024-12-31T23:59:59Z`).
    - `maxResults` (optional): Maximum number of events to return (1 to 2500). Defaults to 50.

Get event
:   Retrieve full details of a specific event by its ID, including recurrence info, conference links, and attachments.
    - `eventId` (required): The ID of the event to retrieve.
    - `calendarId` (optional): Calendar ID containing the event. Use `primary` for the user's primary calendar, or a person's email address to access their calendar. Defaults to `primary`.

List calendars
:   List all calendars accessible to the authenticated user, including calendar ID, name, description, access role, and time zone.
    - `pageToken` (optional): Pagination token from a previous response.

List events
:   List events from a calendar, optionally filtered by time range.
    - `calendarId` (optional): Calendar ID to list events from. Use `primary` for the user's primary calendar, or a person's email address to access their calendar. Defaults to `primary`.
    - `timeMin` (optional): Lower bound (inclusive) for event start time as an RFC3339 timestamp.
    - `timeMax` (optional): Upper bound (exclusive) for event start time as an RFC3339 timestamp.
    - `maxResults` (optional): Maximum number of events to return (1 to 2500). Defaults to 50.
    - `pageToken` (optional): Pagination token from a previous response.
    - `orderBy` (optional): Sort order: `startTime` (chronological, default) or `updated` (last modification time).

Free/Busy
:   Check free/busy availability for one or more people or calendars over a time range. More token-efficient than listing full events when you only need to know if someone is available.
    - `timeMin` (required): Start of the time interval to check as an RFC3339 timestamp (for example, `2024-01-15T09:00:00Z`).
    - `timeMax` (required): End of the time interval to check as an RFC3339 timestamp (for example, `2024-01-15T18:00:00Z`).
    - `calendarIds` (required): List of calendar IDs to check availability for. Use `primary` for the user's own calendar, or a person's email address to check their availability.
    - `timeZone` (optional): Time zone for the query. Defaults to UTC.

## Connector networking configuration [google-calendar-connector-networking-configuration]

Use the **Action configuration settings** in the configuration reference for alerting to customize connector networking,
such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use
`xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [google-calendar-api-credentials]

### OAuth 2.0 authorization code (recommended for ongoing use)

Use this path when you select **OAuth 2.0 authorization code** in {{kib}}. Create a **Web application** OAuth client with
**Authorized JavaScript origins** and **Authorized redirect URIs** (standard Google web-app OAuth pattern).

Start in **[Google Cloud Console](https://console.cloud.google.com/)**. 

1. Select or create a project. Enable the **Google Calendar API** (**APIs & Services** > **Library**).
2. Open **APIs & Services** > **OAuth consent screen**.
  - Create OAuth Client
  - Select Web Application,
  - The **Name** can be something like 'Elastic' or 'Kibana'
  - Under **Authorized JavaScript origins**, add the base origin of your {{kib}} deployment (scheme, host, and port only—for
    example `https://my-kibana.example.com`).
  - Under **Authorized redirect URIs**, add {{kib}}’s connector OAuth callback for your host. Copy the pattern below and
    substitute your public {{kib}} hostname:
    ```text
    https://<your-kibana-host>/api/actions/connector/_oauth_callback
    ```
3. Open **APIs & Services** > **Data Access** and choose scopes your integration needs (at minimum the readonly scopes
   the connector uses by default:
   `https://www.googleapis.com/auth/calendar.readonly`, or broader scopes if your policy allows).
4. Save the client. Copy **Client ID** and **Client secret** into the connector in {{kib}}. The connector automatically
   configures the correct Google OAuth endpoints and scope.

### Bearer token (manual, short-lived)

To use **Bearer Token** authentication, obtain a Google OAuth 2.0 access token with Calendar API scopes—for example via
Google’s OAuth 2.0 Playground.

1. Open the [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/).
2. In the list of APIs, select **Calendar API v3** and select the `https://www.googleapis.com/auth/calendar.readonly` scope (or `https://www.googleapis.com/auth/calendar` for full access).
3. Select **Authorize APIs** and sign in with your Google account.
4. Select **Exchange authorization code for tokens**.
5. Copy the **Access token** and enter it as the **Bearer Token** when configuring the connector in {{kib}}.

::::{note}
OAuth 2.0 Playground tokens expire after about an hour. For production, prefer **OAuth 2.0 authorization code** in {{kib}}
so tokens can be refreshed, or implement your own refresh flow when using bearer tokens.
::::
