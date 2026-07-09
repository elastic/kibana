---
navigation_title: "Trello"
applies_to:
  stack: preview
  serverless: preview
---

# Trello connector [trello-action-type]

The Trello connector communicates with the Trello API.

## Create connectors in {{kib}} [define-trello-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**. For example:

### Connector configuration [trello-connector-configuration]

Trello connectors have the following configuration properties:

<!-- TODO: Add action descriptions here -->
<!-- Example:
API Key
:   The Trello API key for authentication.
-->


## Test connectors [trello-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}.

The Trello connector has the following actions:

<!-- TODO: Add action descriptions here -->
<!-- Example:
Action Name
:   Description of what this action does.
    - **Parameter Name** (required/optional): Parameter description.
-->


## Get API credentials [trello-api-credentials]

To use the Trello connector, you need a Trello API key and API token.

**Get an API key:**

1. Go to [trello.com/power-ups/admin](https://trello.com/power-ups/admin).
2. Create or open a Power-Up (this is just a container for the key — any name works).
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
