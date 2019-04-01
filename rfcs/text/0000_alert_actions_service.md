- Start Date: 2019-02-22
- RFC PR: (leave this empty)
- Kibana Issue: (leave this empty)

# Summary

In order to support alerts within Kibana there is a need to be able to take
specific actions when an alerts' conditions are met. This includes providing
data from the context of the alert condition itself. For instance an action
might be something like creating a github issue with details from the ES index
that generated the alert. For that same type of alert we do not want to restrict
it to only integrating with github but rather allow the user to choose what
action(s) they would like to perform when that alert is triggered. The action
service therefore will be responsible for handling the integrations such as with
github, slack, email, and PagerDuty. Allowing the alert service to focus on
handling the conditional logic. Separating the two will allow for alerts to
support any number of integrations for a specific **action type**.

# Basic example

Here is a basic example of a preconfigured `instance` of an `actionType` with a
specific `handler` (i.e. slack).

```JS
server.actions.fire({
  action: 'send message to slack', // instance
  actionType: 'send message',
  actionParams: {
    message: 'This is a test message from kibana actions service',
    title: 'custom title',
  },
})
```

# Motivation

In order to support multiple integrations with external services such as slack,
email, PagerDuty, twitter, etc. There is a need for an interface that an alert
task would use to execute actions with customized content that is specific to
that alert, but agnostic of the external integration details. In order to
increase customization and extensibility there is a need for a way the alert
task could fire an action without knowing the specifics of a particular service
(i.e email server, slack tokenized url).

We also want to be able to support multiple configurations for each integration.
Such as multiple slacks and/or slack channels. Multiple send email addresses. So
the actions service will provide the capability to define multiple
configurations per integration. we want these configuration **instances** to
support spaces so that they can be separated between user groups. We want to
make the service extensible and allow for additional integrations to be
**registered** by other plugins for different purposes not just for those
methods listed above.

# Detailed design

This proposal defines one method to allow an alert task to be decoupled from the
action(s) that the user wants to be taken when an alert is *triggered*. The
`action` is a preconfigured saved `instance` of an `actionType` for a specific
`handler` and is fired with the parameters for that `actionType`.

The service is broken down into multiple registered types of objects. First and
foremost there is the **action type** which defines the generic parameters that
anyone who wants to `fire` an action of that type needs to provide.

## Defining Action Types

Registering action types is the way that these actions are exposed. Included in
the definition are the required parameters that will then be passed to the
**handler** should provide and those that are handed off to the **handlers** to
fit into whatever service integration they provide.

```JS
server.actions.registerActionType({
  name: 'notification',
  actionParams: [
    { name: 'destination', type: 'string' },
    { name: 'message', type: 'string' },
    { name: 'title', type: 'string', optional: true },
  ],
});
```

The above action parameters are used to validate the inputs to the `fire`
method.

## The Handler

The `handler` is what defines what happens when an action is *fired*. This
will define the particular integration such as slack, email, etc.

```JS
server.actions.registerHandler({
  actionType: 'notification',
  type: 'slack',
  handlerParams: {
    { name: 'channel', type: 'string' },
  },
  async handler({ actionParams, handlerParams }) {
    try {
      const body = JSON.stringify({
        ...handlerParams,
        username: 'webhookbot',
        text: actionParams.message,
        icon_emoji: ':ghost:',
      });
      const result = new url.URL(actionParams.destination);
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

The **handler** will do the actual work of integration, and will receive
decrypted credentials if necessary in order to connect to external services. Any
number of **handlers** can be registered with the actions service by any
dependent plugin, prior to start up to ensure availability for any existing
alerts, or action instances.

Based on the **action type**'s action parameters and the handlers parameters the
handler function will receive the parameters passed to the `fire(...)` method.  



## Creating Instances

Instances are saved in the Kibana index and are used in order to `fire` an action with parameters. The
`params` required are specific to the `actionType`. Changing the `actionType` also
changes what `handlers` are available for it.


```JS
server.actions.registerInstance({
  name: 'send message to slack',
  actionType: 'notification',
  handler: 'slack',
  params: {
    destination: '<slack url>',
  },
  handlerParams: {
    channel: '#bot-playground',
  },
});
```

*Note: instances are saved objects that are space aware*

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
    // destination: '<slack url>' // optional
  },
  // optionally handler params could be added here
  // handlerParams: {...}
})
```

The action `send message to slack` is the instance that is being fired. See
below for details how to create them

## Retrieve a list of available actions

If you want to see the available list of actions that are registered you can get
that list from the `server.actions` service.

```JS
server.actions.available(); // returns ['send message to slack']
```

Or from the front-end there is a REST API that will return the available actions.

```sh
$ curl -X GET localhost:5601/api/actions
```

# Drawbacks

The relationship between **action types** and **handlers** is a bit complex as
well as the supported parameter meta types.

Another downside to this design is that an alert must be changed in order to support
**action types**. So as new action types are added to meet users needs are
discovered alerts will require changes to support the new types. This increases
the code complexity of each alert and time to market for new integrations. And
increased risk of alerts for specific applications not supporting particular
actions. Also differences in UI and customizability for the action handlers may
vary per application.

This might lead to a poor user experience when a user tries to set up an alert
in APM and APM does not yet support calling `webhooks` as it's alerts only
support `notifications`. Or APM might allow a user to configure a template for
an email message but Uptime does not.

# Alternatives

Having a more generic `registry` of `actions` as simple functions that could be
added as a list and executed when one or more `condition` functions returned
`true` was considered. Drawbacks of that approach was that of passing data
between conditions and actions to build customizable messages that included data
specific to a particular action.

Embedding actions in `canvas expressions` was discussed main issue being lack of
support for running `canvas expressions` from the server side for background
processing. But it is not impossible to imagine that a canvas expression could
easily be written to use this service from the front-end.

# Adoption strategy

The future alerting service will be providing this service to the alerts that
will be defined and used for user defined notifications. Other background tasks
and jobs are free to call upon this service where desired to provide additional
notifications.

It is possible that this service could be extended to provide indexing
operations and used from front-end apps.

# How we teach this

A common pattern in Kibana is that of a service which provides a `registry`
that is completely pluggable by any consumers. New action types and handlers
can be added or reused by any plugin. This is similar to the way the task
manager is pluggable. Plugins will provide additional types and handlers. And
users would then be able to create any number of instances.

`fire` The actual execution of the action directly with the necessary parameters
for the action type.

`instance` An action instance that is a saved object which contains all the settings
necessary to `fire` an action.

`action types` A type of action that can be invoked by an alert or task with an
action service context.

`handler` Code that handles the actual action connecting to an external
service in the most likely case.

There should be a readme and/or acceptable generated documentation for these
exposed methods. Multiple examples for specific use cases should help teach how
this interface should be used.
