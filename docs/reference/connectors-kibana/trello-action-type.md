---
navigation_title: "Trello"
type: reference
description: "Use the Trello connector to search and browse boards, lists, and cards, create and update cards, and post comments using the Trello REST API."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# Trello connector [trello-action-type]

The Trello connector connects directly to the Trello REST API using an API key and token. It enables AI agents in Agent Builder to search and browse boards, lists, and cards, create and update cards, and post comments.

## Create connectors in {{kib}} [define-trello-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**. For example:

### Connector configuration [trello-connector-configuration]

Trello connectors have the following configuration properties:

API key
:   The Trello API key for authentication. See [Get API credentials](#trello-api-credentials).

API token
:   The Trello API token. Tokens must be generated manually by visiting a Trello authorization URL. See [Get API credentials](#trello-api-credentials).


## Test connectors [trello-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}. The test verifies
the connection by fetching the authenticated member's profile (`GET /1/members/me`).

The Trello connector has the following actions:

Who am I
:   Returns the member record for the authenticated Trello account. Useful for verifying which
    account is connected or resolving your own member ID. Takes no parameters.

List boards
:   Lists all boards the authenticated member belongs to. Returns board IDs, names, and
    descriptions. Takes no parameters.

Get board
:   Returns full details for a single board by ID.
    - **Board ID** (required): The 24-character Trello board ID, as returned by **List boards** or **Search**.

List board lists
:   Returns the open lists on a board (for example, "To Do", "Doing", "Done"). Returns list IDs
    and names.
    - **Board ID** (required): The 24-character Trello board ID.

List board cards
:   Returns all open cards on a board across all of its lists.
    - **Board ID** (required): The 24-character Trello board ID.

List board labels
:   Returns the labels defined on a board, including their IDs, names, and colors. Call this
    before **Create card** or **Update card** to resolve label names to IDs for the Label IDs
    parameter.
    - **Board ID** (required): The 24-character Trello board ID.

List board members
:   Returns the members (collaborators) of a board, including their IDs, usernames, and full
    names. Call this before **Create card** or **Update card** to resolve member names to IDs
    for the Member IDs parameter.
    - **Board ID** (required): The 24-character Trello board ID.

List list cards
:   Returns the open cards within a single list.
    - **List ID** (required): The 24-character Trello list ID, as returned by **List board lists**.

Get card
:   Returns full details for a single card by ID, including description, due date, members, and
    labels.
    - **Card ID** (required): The 24-character Trello card ID.

Get card comments
:   Returns the comment history for a card.
    - **Card ID** (required): The 24-character Trello card ID.

Search
:   Searches across Trello boards and cards by keyword. Supports operators such as
    `board:"Board Name"`, `label:red`, `member:username`, `due:week`, and `is:open`.
    - **Query** (required): The search query string (maximum 2000 characters).
    - **Model types** (optional): Comma-separated result types to include: `cards`, `boards`,
      `members`, `organizations`. Defaults to `cards,boards`.
    - **Board IDs** (optional): Comma-separated board IDs to restrict the search scope.
    - **Cards limit** (optional): Maximum number of cards to return (1–1000). Defaults to 10.
    - **Boards limit** (optional): Maximum number of boards to return (1–1000). Defaults to 10.

Create card
:   Creates a new card in a list. Returns the created card including its ID. Use **List board
    lists** first to find the target list ID.
    - **List ID** (required): The ID of the list to create the card in.
    - **Name** (required): The title of the card (maximum 16384 characters).
    - **Description** (optional): Card description text. Supports Trello-flavored Markdown.
    - **Due date** (optional): ISO 8601 datetime string, for example `2024-06-15T17:00:00.000Z`.
    - **Position** (optional): Position within the list: `top`, `bottom`, or a positive number.
      Defaults to `bottom`.
    - **Member IDs** (optional): Comma-separated Trello member IDs to assign to the card.
    - **Label IDs** (optional): Comma-separated Trello label IDs to apply to the card.

Update card
:   Edits a card's fields, moves it to another list, or archives or unarchives it. Returns the
    updated card. There is no hard-delete action — archiving is the only way to remove a card.
    - **Card ID** (required): The 24-character Trello card ID.
    - **Name** (optional): New title for the card.
    - **Description** (optional): New description text.
    - **Due date** (optional): New due date as an ISO 8601 string, or `null` to clear it.
    - **List ID** (optional): Target list ID to move the card into a different list.
    - **Position** (optional): New position within its list: `top`, `bottom`, or a positive number.
    - **Closed** (optional): Set to `true` to archive the card, or `false` to unarchive it.
    - **Member IDs** (optional): Comma-separated Trello member IDs to assign to the card, replacing the current assignment. Use **List board members** to resolve names to IDs.
    - **Label IDs** (optional): Comma-separated Trello label IDs to apply to the card, replacing the current labels. Use **List board labels** to resolve label names to IDs.

Add comment
:   Posts a comment on a card. Returns the created comment action.
    - **Card ID** (required): The 24-character Trello card ID.
    - **Text** (required): The comment text (maximum 16384 characters).


## Get API credentials [trello-api-credentials]

To use the Trello connector, you need a Trello API key and API token.

**Get an API key:**

1. Go to [trello.com/power-ups/admin](https://trello.com/power-ups/admin).
2. Create or open a Power-Up (this is a container for the key — any name works).
3. Open its **API Key** tab and generate a key if one doesn't already exist.

**Get an API token:**

Trello does not display tokens directly in its UI — you generate one by visiting an authorization
URL yourself:

1. Copy this URL and replace `YOUR_API_KEY` with the key from the previous step:

   ```
   https://trello.com/1/authorize?expiration=never&scope=read,write&response_type=token&key=YOUR_API_KEY
   ```

2. Open it in a browser and sign in to the Trello account you want the connector to use.
3. Click **Allow**. Trello displays the token as plain text on the resulting page.
4. Copy that value into the connector's **API token** field.
