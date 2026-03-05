---
navigation_title: "Zoom"
type: reference
description: "Use the Zoom connector to access meetings, cloud recordings, transcripts, chat logs, and participants via the Zoom REST API."
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/zoom-action-type.html
applies_to:
  stack: preview 9.4
  serverless: preview
---

# Zoom connector [zoom-action-type]

The Zoom connector enables access to Zoom meetings, cloud recordings, transcripts, chat logs, and meeting participants via the Zoom REST API v2.

## Create connectors in {{kib}} [define-zoom-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [zoom-connector-configuration]

Zoom connectors have the following configuration properties:

Zoom access token
:   A Zoom Server-to-Server OAuth access token. Generate one via the Zoom Marketplace or API (see [Get API credentials](#zoom-api-credentials)). Tokens expire after 1 hour.


## Test connectors [zoom-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}. The test verifies connectivity by calling the `/users/me` endpoint and displaying the authenticated user's name.

The Zoom connector has the following actions:

Who am I
:   Get the profile of the currently authenticated Zoom user, including name, email, role, timezone, and personal meeting URL. Takes no inputs.

List meetings
:   List meetings for a user. Supports filtering by type (scheduled, live, upcoming, etc.).
    - **userId** (optional): User ID or email. Defaults to `me`.
    - **type** (optional): Meeting type filter. Valid values: `scheduled`, `live`, `upcoming`, `upcoming_meetings`, `previous_meetings`. Defaults to `upcoming`.
    - **pageSize** (optional): Number of results per page (1–300).
    - **nextPageToken** (optional): Pagination token from a previous response.

Get meeting details
:   Get details of a scheduled or recurring meeting, including topic, agenda, start time, duration, timezone, host info, join URL, passcode, and settings. Use this to understand what a meeting is about before looking at recordings or participants.
    - **meetingId** (required): Meeting ID or UUID.

Get past meeting details
:   Get summary information for a meeting that has already ended. Returns total minutes, participant count, and actual start/end times. Only works for past meetings.
    - **meetingId** (required): Past meeting ID or UUID.

Get meeting recordings
:   Get cloud recordings for a specific meeting. The response includes the recording passcode and `recording_files` with types such as `audio_transcript` (VTT), `chat_file` (TXT), `shared_screen_with_speaker_view`, `audio_only`, and more.
    - **meetingId** (required): Meeting ID or UUID.

List user recordings
:   List cloud recordings for a user within a date range. Returns meetings with their `recording_files` (including transcripts and chat files).
    - **userId** (optional): User ID or email. Defaults to `me`.
    - **from** (optional): Start date in `YYYY-MM-DD` format. Defaults to current date.
    - **to** (optional): End date in `YYYY-MM-DD` format. Range cannot exceed 1 month.
    - **pageSize** (optional): Number of results per page (1–300).
    - **nextPageToken** (optional): Pagination token from a previous response.

Download recording file
:   Download a recording file by its download URL. Works for transcripts (VTT format), chat logs (TXT format), and other recording files. Content exceeding the character limit is truncated.
    - **downloadUrl** (required): The `download_url` from a recording file object obtained via *Get meeting recordings* or *List user recordings*.
    - **maxChars** (optional): Maximum characters to return. Defaults to 100,000. Content exceeding this limit is truncated, and the response includes a `truncated` flag.

Get meeting participants
:   List people who actually attended a past meeting. Returns participant name, email, join/leave times, and duration. Only works for meetings that have already ended.
    - **meetingId** (required): Past meeting ID or UUID.
    - **pageSize** (optional): Number of results per page (1–300).
    - **nextPageToken** (optional): Pagination token from a previous response.

Get meeting registrants
:   List people who registered for a meeting. Works for both upcoming and past meetings that have registration enabled.
    - **meetingId** (required): Meeting ID.
    - **status** (optional): Filter by registration status. Valid values: `pending`, `approved`, `denied`. Defaults to `approved`.
    - **pageSize** (optional): Number of results per page (1–300).
    - **nextPageToken** (optional): Pagination token from a previous response.

Recommended flow
:   Use *Who am I* to verify the connected user identity. Use *List user recordings* or *Get meeting recordings* to find available recording files, then call *Download recording file* with the `download_url` of the desired file. Look for `recording_type` values of `audio_transcript` for transcripts and `chat_file` for post-meeting chat logs.


## Get API credentials [zoom-api-credentials]

To use the Zoom connector, you need to create a Server-to-Server OAuth app in the Zoom Marketplace:

1. Create a Server-to-Server OAuth app:
   - Go to the [Zoom App Marketplace](https://marketplace.zoom.us/)
   - Click **Develop** > **Build App**
   - Select **Server-to-Server OAuth**
   - Provide an app name and click **Create**

2. Note your credentials:
   - **Account ID**: Displayed on the app credentials page
   - **Client ID**: Displayed on the app credentials page
   - **Client Secret**: Displayed on the app credentials page

3. Configure scopes:
   - Navigate to the **Scopes** tab
   - Add the following granular scopes:
     - `user:read:user:admin` — verify connection
     - `meeting:read:meeting:admin` — get meeting details
     - `meeting:read:list_meetings:admin` — list meetings
     - `meeting:read:past_meeting:admin` — get past meeting details
     - `meeting:read:list_past_participants:admin` — list past meeting participants
     - `meeting:read:list_registrants:admin` — list meeting registrants
     - `cloud_recording:read:list_recording_files:admin` — get meeting recordings
     - `cloud_recording:read:list_user_recordings:admin` — list user recordings

4. Activate the app:
   - Navigate to the **Activation** tab
   - Click **Activate your app**

5. Generate an access token:
   - Use the following command to generate a token (valid for 1 hour):

     ```bash
     curl -X POST "https://zoom.us/oauth/token?grant_type=account_credentials&account_id=YOUR_ACCOUNT_ID" \
       -u "YOUR_CLIENT_ID:YOUR_CLIENT_SECRET"
     ```

   - Copy the `access_token` from the JSON response and paste it into the connector configuration in {{kib}}.

::::{note}
Zoom Server-to-Server OAuth tokens expire after 1 hour. You will need to regenerate the token when it expires. Cloud recordings (including transcripts and chat logs) require a Zoom Pro plan or higher.
::::
