- Start Date: 2019-02-22
- RFC PR: (leave this empty)
- Kibana Issue: (leave this empty)

# Summary

In order to support alerts within Kibana. We need to be able to take
customizable actions when an alerts' conditions are met. This includes providing
data from the context of the alert itself. For instance creating a github issue 
with details from the ES query that generated the alert. For that same type of 
alert we do not want to restrict it to integrating only with github but rather 
allow the user to choose whatever action(s) they would like to perform when 
that alert is triggered. 

The action service therefore will be responsible for 
handling the integrations such as with github, slack, email, and PagerDuty. 
Allowing the alert service to focus on handling the querying and conditional 
logic. Separating the two concerns will allow for alerts to more easily support 
any number of integrations for a specific **action type**. 

# Basic example

Here is a basic example of a preconfigured `instance` of an `actionType` with a
specific `handler` (i.e. slack).

```JS
server.actions.fire({
  action: 'send message to slack', // instance
  actionParams: {
    message: 'This is a test message from kibana actions service',
    title: 'custom title',
  },
})
```

# Motivation

In order to support multiple integrations with external services such as slack,
email, PagerDuty, twitter, etc. We need to handle credentials for integrating with
those services but not require those to be necessary at the time an alert is created.
We still want the actions to be executable with customized content that is specific to
the alert, but agnostic of the external integration details. In order to increase 
customization and extensibility there is a need for a way the alert task could 
fire an action without knowing the specifics of a particular service.

The following might help illustrate the relationship

- Alert task queries ES and checks some condition
  - Condition met
  - alert task fires an `preconfigured action instatnce` passing only required fields
  - action service invokes handler/handlers for preconfigured actions

We also want to be able to support multiple configurations for each integration.
Such as multiple slacks and/or slack channels. Multiple send email addresses
email templates etc. The actions service will provide the capability to define 
multiple configurations per integration. We want these configuration **instances** 
to support spaces so that they can be separated between user groups. We want to
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
are allowed in order to `fire` an action of that type.

Then there is the registration of the **handler** function which is required to
be registered before Kibana starts. This will ensure that the method is available
whenever the action service is asked to execute an action. These handlers are 
specifically written to be called upon firing a specific _action type_. Therefore 
they can be written to expect the _action types_ parameters and use them 
appropriately.

Next we have the **instances** these objects are a way to persist **handler** 
specific parameters such as _smtp settings_, _access tokens_, or other types of 
settings. Anything that one would not want/need to specify every time an action needed
to be fired by an alert. And certainly not ones that we would want to store in each
alert document itself. These parameters will be store as encrypted attributes by the
secret service.

For instance a slack handler needs to have a slack _tokenized url_ in order to
send messages, we do not want to require the user to specify this url every time 
they create an alert with a _send to slack_ action. 

The benefit of this approach is that the alert can have a list of named 
`preconfigured instances` and simply let the actions service figure out which
handler to call and how to get the specific handlers parameters. So you could
have an alert that sends data to multiple slack channels and an email address
with something like the following:

```JS
const message = "An Alert has triggered";
const title = "Alert for X";
const actionsList = ['send to main-channel', 'send to team channel', 'send to admin email']

actionsList.forEach(a => {
  server.actions.fire({
    action: a,
    actionParams: { message, title },
  });
});
```

## Defining Action Types

Registering action types is the way that these actions can be extended. 
Included in the definition are the required parameters that will then be 
passed to the **handler**.

```JS
server.actions.registerActionType({
  actionType: 'notification',
  actionParams: [
    { name: 'destination', type: 'string' },
    { name: 'message', type: 'string' },
    { name: 'title', type: 'string', optional: true },
  ],
});
```

```JS
server.actions.registerActiontype({
  actionType: 'user-action',
  actionParams: [
    { name: 'app_name', type: 'string' },
    { name: 'action_name', type: 'string' }
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
    { name: 'tokenizedUrl', type: 'secret' },
  },
  async handler({ actionParams, handlerParams }) {
    try {
      const body = JSON.stringify({
        channel: actionParams.destination,
        username: 'webhookbot',
        text: actionParams.message,
        icon_emoji: ':ghost:',
      });
      const result = new url.URL(handlerParams.tokenizedUrl);
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

The **handler** will do the actual work of called the external service, and will 
receive decrypted credentials if necessary in order to connect to external 
services. Any number of **handlers** can be registered with the actions service 
by any dependent plugin. These handlers must be registered prior to start up to 
ensure availability for any existing alerts, or action instances.

Based on the **action type**'s action parameters and the handler parameters the
handler function will receive the parameters passed to the `fire(...)` method.

## Creating Instances

Instances are saved in the Kibana index and are used in order to `fire` an action with parameters. The `params` required are specific to the `actionType`. Changing the `actionType` also
changes what `handlers` are available for it.


```JS
server.actions.registerInstance({
  name: 'send message to slack',
  actionType: 'notification',
  handlerType: 'slack',
  actionParams: {
    destination: '#bot-playground',
  },
  handlerParams: {
    tokenizedUrl: '<slack url>',
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
  actionParams: {
    message: 'This is a test message from kibana actions service',
    title: 'custom title',
    // destination: '<slack url>' // aleady defined for insttance but could be overridden
  },
  // optionally handler params could be added here, to override instances
  // handlerParams: {...}
});
```

The action `send message to slack` is the instance that is being fired.

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
different **action types**. So as new action types are added to meet users needs are
discovered alerts will require changes to support the new types. This increases
the code complexity of each alert and time to market for new integrations. And
increased risk of alerts for specific applications not supporting every action type. 
Also the UI may vary greatly as a result of this design. 

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

`registerInstance` An action instance that is a saved object which contains all the settings
necessary to `fire` an action.

`action types` A type of action that can be invoked by an alert or task with an
action service context.

`handler` Code that handles the actual action connecting to an external
service in the most likely case.

There should be a readme and/or acceptable generated documentation for these
exposed methods. Multiple examples for specific use cases should help teach how
this interface should be used.
