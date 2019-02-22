- Start Date: 2019-02-22
- RFC PR: (leave this empty)
- Kibana Issue: (leave this empty)

# Summary

An actions service for registering *action instances* for a specific
*action type* for a given *connector*.

# Basic example

An example of a preconfigured `instance` of a `actionType` with a specific
`connectorType` (i.e. slack).

```JS
server.actions.fire({
  action: 'send message to slack',
  actionType: 'send message',
  params: {
    message: 'This is a test message from kibana actions service',
    title: 'custom title',
  },
})
```

# Motivation

In order to support multiple integrations with external services such as slack,
email, pager-duty, twitter, etc. There is a need for an interface that an alert
task would use to execute actions with customized content that is specific to
that alert. In order to increase customization and extensibility there is a need
for a way the task could fire an action without knowing the specifics of a
particular service (i.e email, slack)

# Detailed design

This proposal defines one method to allow an alert task to be decoupled from the
action(s) that the user wants the alert task to execute when the alert is
*triggered*. The `action` is a preconfigured saved `instance` of a `actionType`
for a specific `connectorType`

## Executing Actions

Each action instance can be fired with optional action type parameter. You need
to have a defined action instance in order to fire an action.

```JS
server.actions.fire({
  action: 'send message to slack',
  actionType: 'notification',
  params: {
    message: 'This is a test message from kibana actions service',
    title: 'custom title',
  },
})
```

The action `send message to slack` is the instance that is being fired. See
below for details how to create them

## Creating Instances

Instances are saved in the Kibana index and are used in order to `fire` an action with parameters. The
`params` required are specific to the `actionType` that you specify. Changing the `actionType` also
changes what `connectorTypes` are available for it.


```JS
server.actions.instance({
  name: 'send message to slack',
  actionType: 'notification',
  connectorType: 'slack',
  params: {
    destination: '<example slack url>',
  },
  connectorParams: {
    channel: '#bot-playground',
  },
});
```

*Note: instances are saved objects that are space specific*

## The Connectors

The `connector` is what defines what happens when an action is *fired*. This
will define the particular integration such as slack, email, etc.

```JS
registerConnector({
  actionType: 'notification',
  connectorType: 'slack',
  async handler({ params, connectorParams }) {
    try {
      const body = JSON.stringify({
        ...connectorParams,
        username: 'webhookbot',
        text: params.message,
        icon_emoji: ':ghost:',
      });
      const result = new url.URL(params.destination);
      await fetch(result.toString(), {
        method: 'POST',
        body,
      });
    } catch (e) {
      warn(`[slack] failed with ${e.message}`);
    }
  },
});
```

## Defining Action Types

Registering action types is the way that these actions are exposed to the
alerts. Included in the definition are the required parameters that the alert
should provide and those that are handed off to the *connectors* to fit into
whatever service integration they provide.

```JS
registerActionType({
  name: 'notification',
  initParams: [{ name: 'username', type: 'string' }, { name: 'password', type: 'secret' }],
  executionParams: [
    { name: 'destination', type: 'string' },
    { name: 'message', type: 'string' },
    { name: 'title', type: 'string', optional: true },
  ],
});
```

# Drawbacks

Why should we *not* do this? Please consider:

- implementation cost, both in term of code size and complexity
- the impact on teaching people Kibana development
- integration of this feature with other existing and planned features
- cost of migrating existing Kibana plugins (is it a breaking change?)

There are tradeoffs to choosing any path. Attempt to identify them here.

The relationship between *action types* and *connetors* is a bit complex as well
as the supported parameter meta types.

Another downside to this design is that an alert must be changed in order to support
*action types*. So as new action types to meet user needs are discovered alerts
will need to be changed if they are to be supported. This increases the code
complexity of each alert and time to market for new integrations.

This might lead to a poor user experience when a user tries to set up an alert
in APM and APM does not yet support calling `webhooks` as it's task only
supports `notifications`.

# Alternatives

What other designs have been considered? What is the impact of not doing this?

# Adoption strategy

If we implement this proposal, how will existing Kibana developers adopt it? Is
this a breaking change? Can we write a codemod? Should we coordinate with
other projects or libraries?

# How we teach this

What names and terminology work best for these concepts and why? How is this
idea best presented? As a continuation of existing Kibana patterns?

Would the acceptance of this proposal mean the Kibana documentation must be
re-organized or altered? Does it change how Kibana is taught to new developers
at any level?

How should this feature be taught to existing Kibana developers?

# Unresolved questions

Optional, but suggested for first drafts. What parts of the design are still
TBD?
