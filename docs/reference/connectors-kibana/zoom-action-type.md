---
navigation_title: "Zoom"
type: reference
description: "Use the Zoom connector to access meetings, cloud recordings, transcripts, chat logs, and participants using the Zoom REST API."
applies_to:
  stack: preview 9.4
  serverless: preview
---

# Zoom connector [zoom-action-type]

The Zoom connector enables access to Zoom meetings, cloud recordings, transcripts, chat logs, and meeting participants through the Zoom REST API v2.

## Create connectors in {{kib}} [define-zoom-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [zoom-connector-configuration]

Zoom connectors have the following configuration properties:

Zoom access token
:   A Zoom Server-to-Server OAuth access token. Generate one through the Zoom Marketplace or API (refer to [Get API credentials](#zoom-api-credentials)). Tokens expire after 1 hour.

## Test connectors [zoom-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}. The test verifies connectivity by calling the `/users/me` endpoint and displaying the authenticated user's name.

The Zoom connector has the following actions:

Who am I
:   Get the profile of the currently authenticated Zoom user, including name, email, role, timezone, and personal meeting URL. Takes no inputs.

List meetings
:   List meetings for a user. Supports filtering by type (scheduled, live, upcoming, and others).
    - `userId` (optional): User ID or email. Defaults to `me`.
    - `type` (optional): Meeting type filter. Valid values: `scheduled`, `live`, `upcoming`, `upcoming_meetings`, `previous_meetings`. Defaults to `upcoming`.
    - `pageSize` (optional): Number of results per page (1 to 300).
    - `nextPageToken` (optional): Pagination token from a previous response.

Get meeting details
:   Get details of a scheduled or recurring meeting, including topic, agenda, start time, duration, timezone, host info, join URL, passcode, and settings. Use this to understand what a meeting is about before looking at recordings or participants.
    - `meetingId` (required): Meeting ID or UUID.

Get past meeting details
:   Get summary information for a meeting that has already ended. Returns total minutes, participant count, and actual start and end times. Only works for past meetings.
    - `meetingId` (required): Past meeting ID or UUID.

Get meeting recordings
:   Get cloud recordings for a specific meeting. The response includes the recording passcode and `recording_files` with types such as `audio_transcript` (VTT), `chat_file` (TXT), `shared_screen_with_speaker_view`, `audio_only`, and more.
    - `meetingId` (required): Meeting ID or UUID.

List user recordings
:   List cloud recordings for a user within a date range. Returns meetings with their `recording_files` (including transcripts and chat files).
    - `userId` (optional): User ID or email. Defaults to `me`.
    - `from` (optional): Start date in `YYYY-MM-DD` format. Defaults to current date.
    - `to` (optional): End date in `YYYY-MM-DD` format. Range cannot exceed 1 month.
    - `pageSize` (optional): Number of results per page (1 to 300).
    - `nextPageToken` (optional): Pagination token from a previous response.

Download recording file
:   Download a recording file by its download URL. Works for transcripts (VTT format), chat logs (TXT format), and other recording files. Content exceeding the character limit is truncated.
    - `downloadUrl` (required): The `download_url` from a recording file object obtained from *Get meeting recordings* or *List user recordings*.
    - `maxChars` (optional): Maximum characters to return. Defaults to 100,000. Content exceeding this limit is truncated, and the response includes a `truncated` flag.

Get meeting participants
:   List people who actually attended a past meeting. Returns participant name, email, join and leave times, and duration. Only works for meetings that have already ended.
    - `meetingId` (required): Past meeting ID or UUID.
    - `pageSize` (optional): Number of results per page (1 to 300).
    - `nextPageToken` (optional): Pagination token from a previous response.

Get meeting registrants
:   List people who registered for a meeting. Works for both upcoming and past meetings that have registration turned on.
    - `meetingId` (required): Meeting ID.
    - `status` (optional): Filter by registration status. Valid values: `pending`, `approved`, `denied`. Defaults to `approved`.
    - `pageSize` (optional): Number of results per page (1 to 300).
    - `nextPageToken` (optional): Pagination token from a previous response.

::::{tip}
Use *Who am I* to verify the connected user identity. Use *List user recordings* or *Get meeting recordings* to find available recording files, then call *Download recording file* with the `download_url` of the desired file. Look for `recording_type` values of `audio_transcript` for transcripts and `chat_file` for post-meeting chat logs.
::::

## Connector networking configuration [zoom-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [zoom-api-credentials]

The Zoom connector supports two authentication methods: **OAuth Authorization Code** (recommended) and **Server-to-Server OAuth** (via Bearer token).

### OAuth Authorization Code (recommended)

Use this method to let users authorize the connector with their own Zoom account. The connector handles token exchange and refresh automatically.

::::{note}
You must create a **General** app in the Zoom Marketplace (not a User-managed app). The `cloud_recording` scopes required for recording access are only available on General apps. If you do not intend to publish the app publicly, you can request **Unlisted** status from Zoom after creation.
::::

1. Go to the [Zoom App Marketplace](https://marketplace.zoom.us/).
2. Select **Develop** > **Build App**.
3. Select **General App**.
4. Enter an app name and select **Create**.
5. On the **App Credentials** tab, copy the **Client ID** and **Client Secret**.
6. Set the **OAuth Redirect URL** to your Kibana OAuth callback URL (for example, `https://<your-kibana-host>/api/actions/connector/_oauth_callback`).
7. On the **Scopes** tab, add the following granular scopes:
   - `user:read:user` — verify connection
   - `meeting:read:meeting` — get meeting details
   - `meeting:read:list_meetings` — list meetings
   - `meeting:read:past_meeting` — get past meeting details
   - `meeting:read:list_past_participants` — list past meeting participants
   - `meeting:read:list_registrants` — list meeting registrants
   - `cloud_recording:read:list_recording_files` — get meeting recordings
   - `cloud_recording:read:list_user_recordings` — list user recordings
8. On the **Activation** tab, select **Activate your app**.
9. In {{kib}}, create a Zoom connector and select **OAuth Authorization Code** as the authentication method. Enter the **Client ID** and **Client Secret**, then authorize with your Zoom account.

::::{note}
Cloud recordings (including transcripts and chat logs) require a Zoom Pro plan or higher.
::::

### Server-to-Server OAuth

Use this method for automated or backend access without user interaction. Tokens are generated manually and expire after 1 hour.

1. Go to the [Zoom App Marketplace](https://marketplace.zoom.us/).
2. Select **Develop** > **Build App**.
3. Select **Server-to-Server OAuth**.
4. Enter an app name and select **Create**.
5. Copy the following credentials from the app credentials page:
   - **Account ID**
   - **Client ID**
   - **Client Secret**
6. On the **Scopes** tab, add the following granular scopes:
   - `user:read:user:admin` — verify connection
   - `meeting:read:meeting:admin` — get meeting details
   - `meeting:read:list_meetings:admin` — list meetings
   - `meeting:read:past_meeting:admin` — get past meeting details
   - `meeting:read:list_past_participants:admin` — list past meeting participants
   - `meeting:read:list_registrants:admin` — list meeting registrants
   - `cloud_recording:read:list_recording_files:admin` — get meeting recordings
   - `cloud_recording:read:list_user_recordings:admin` — list user recordings
7. On the **Activation** tab, select **Activate your app**.
8. Generate an access token (valid for 1 hour):

   ```bash
   curl -X POST "https://zoom.us/oauth/token?grant_type=account_credentials&account_id=YOUR_ACCOUNT_ID" \
     -u "YOUR_CLIENT_ID:YOUR_CLIENT_SECRET"
   ```

9. Copy the `access_token` from the JSON response and enter it in the **Zoom access token** field when configuring the connector in {{kib}}.

::::{note}
Zoom Server-to-Server OAuth tokens expire after 1 hour. You need to regenerate the token when it expires. Cloud recordings (including transcripts and chat logs) require a Zoom Pro plan or higher.
::::
