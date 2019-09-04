- Start Date: 2019-09-12
- RFC PR: currently https://github.com/elastic/kibana/pull/45081
- Kibana Issue: (leave this empty)

See also issue https://github.com/elastic/kibana/issues/45083, which is an
umbrella issue tracking ongoing initial work.


# Summary

For the Make It Action alerting / action plugins, we will need a way to
persist data regarding alerts and actions, for UI and investigative purposes.
We're referring to this persisted data as "events", and will be persisted to
a new elasticsearch index referred to as the "event log".

Example events are actions firing, alerts running their scheduled functions,
alerts scheduling actions to run, etc.

This functionality will be provided in a new NP plugin `event_log`, and will
provide server-side plugin APIs to write to the event log, and run limited
queries against it. For now, access via HTTP will not be available, due to
security concerns and lack of use cases.

The current clients for the event log are the actions and alerting plugins,
however the event log currently has nothing specific to them, and is general
purpose, so can be used by any plugin to "log events".

We currently assume that there may be many events logged, and that (some) customers
may not be interested in "old" events, and so to keep the event log from
consuming too much disk space, we'll set it up with ILM and some kind of
reasonable default policy that can be customized by the user.  This implies
also the use of rollver, setting a write index alias upon rollover, and
that searches for events will be done via an ES index pattern / alias to search
across event log indices with a wildcard.

The shape of the documents indexed into the event log index is a subset of ECS
properties with a few Kibana extensions.  Over time the subset is of ECS and
Kibana extensions will likely grow.

# Basic example

When an action is executed, an event should be written to the event log.

Here's a [`kbn-action` command](https://github.com/pmuellr/kbn-action) to
execute a "server log" action (writes a message to the Kibana log):

```console
$ kbn-action execute 79b4c37e-ef42-4421-a0b0-b536840f930d '{level:info message:hallo}'
{
    "status": "ok"
}
```

Here's the event written to the event log index:

```json
{
  "_index": ".kibana-event-log-000001",
  "_type": "_doc",
  "_id": "d2CXT20BPOpswQ8vgXp5",
  "_score": 1,
  "_source": {
    "event": {
      "provider": "actions",
      "action": "execute",
      "start": "2019-12-09T21:16:43.424Z",
      "end": "2019-12-09T21:16:43.425Z",
      "duration": 1000000
    },
    "kibana": {
      "namespace": "default",
      "saved_objects": [
        {
          "type": "action",
          "id": "79b4c37e-ef42-4421-a0b0-b536840f930d"
        }
      ]
    },
    "message": "action executed successfully: 79b4c37e-ef42-4421-a0b0-b536840f930d - .server-log - server-log",
    "@timestamp": "2019-12-09T21:16:43.425Z",
    "ecs": {
      "version": "1.3.1"
    }
  }
}
```


# Motivation

The existing designs for Make It Action describe UIs which show some amount
of alert "history".  Up till now, we had no where to write this history,
and so a new elasticsearch index is required for that.  Because we already
have two known clients of this plugin, which are related but different,
the design of the event documents is very generic, which means it could easily
be used by other plugins that would like to record "events", for the same
general purposes.

The shape of the document written to the index is [ECS][] with an extended field
of `kibana` with some Kibana-related properties contained within it.

Since there are some security concerns with the data, we are currently
restricting access via known saved object ids.  That is, you can only query
history records associated with specific saved object ids.

[ECS]: https://www.elastic.co/guide/en/ecs/current/index.html

# Detailed design

## API

```typescript
// IEvent is a TS type generated from the subset of ECS supported

// the NP plugin returns a service instance from setup() and start()
export interface IEventLogService {
  registerProviderActions(provider: string, actions: string[]): void;
  isProviderActionRegistered(provider: string, action: string): boolean;
  getProviderActions(): Map<string, Set<string>>;

  getLogger(properties: IEvent): IEventLogger;
}

export interface IEventLogger {
  logEvent(properties: IEvent): void;
}
```

The plugin exposes an `IEventLogService` object to plugins that pre-req it.
Those plugins need to call `registerProviderActions()` to indicate the values
of the `event.provider` and `event.action` values they will be using
when logging events.

The pre-registration helps in two ways:

- dealing with misspelled values
- preventing index explosion on those fields

Once the values are registered, the plugin will get an `IEventLogger` instance
by passing in a set of default properties to be used for all it's logging,
to the `getLogger()` method. For instance, the `actions` plugin creates a
logger with `event.provider` set to `actions`, and provides `event.action`
values when writing actual entries.

The `IEventLogger` object can be cached at the plugin level and accessed by
any code in the plugin.  It has a single method to write an event log entry,
`logEvent()`, which is passed specific properties for the event.

The final data written is a combination of the data passed to `getLogger()` when
creating the logger, and the data passed on the `logEvent()` call, and then
that result is validated to ensure it's complete and valid.  Errors will be
logged to the server log.

The `logEvent()` method returns no values, and is itself not asynchronous. 
It's a "call and forget" kind of thing.  The method itself will arrange 
to have the ultimate document written to the index asynchronously.  It's designed
this way because it's not clear what a client would do with a result from this
method, nor what it would do if the method threw an error.  All the error
processing involved with getting the data into the index is handled internally,
and logged to the server log as appropriate.


## Stored data

The elasticsearch index for the event log will have ILM and rollover support,
as customers may decide to only keep recent event documents, wanting indices
with older event documents deleted, turned cold, frozen, etc.  We'll supply
some default values, but customers will be able to tweak these.

The index template, mappings, config-schema types, etc for the index can
be found in the [x-pack/plugins/event_log/generated directory](../../x-pack/plugins/event_log/generated).  These files are generated from a script which takes as
input the ECS properties to use, and the Kibana extensions.

See [ilm rollover action docs][] for more info on the `is_write_index`, and `index.lifecycle.*` properties.

[ilm rollover action docs]: https://www.elastic.co/guide/en/elasticsearch/reference/current/_actions.html#ilm-rollover-action

Of particular note in the `mappings`:

- all "objects" are `dynamic: 'strict'` implies users can't add new fields
- all the `properties` are indexed

We may change some of that before releasing.

## ILM setup

We'll want to provide default ILM policy, this seems like a reasonable first
attempt:

```
PUT _ilm/policy/event_log_policy   
{
  "policy": {                       
    "phases": {
      "hot": {                      
        "actions": {
          "rollover": {             
            "max_size": "5GB",
            "max_age": "30d"
          }
        }
      }
    }
  }
}
```

This means that ILM would "rollover" the current index, say
`.kibana-event-log-000001` by creating a new index `.kibana-event-log-000002`,
which would "inherit" everything from the index template, and then ILM will
set the write index of the the alias to the new index.  This would happen
when the original index grew past 5 GB, or was created more than 30 days ago.

For more relevant information on ILM, see:
[getting started with ILM doc][] and [write index alias behavior][]:

[getting started with ILM doc]: https://www.elastic.co/guide/en/elasticsearch/reference/current/getting-started-index-lifecycle-management.html
[write index alias behavior]: https://www.elastic.co/guide/en/elasticsearch/reference/master/indices-rollover-index.html#indices-rollover-is-write-index


# Drawbacks

Leaves things up to the user to customize the ILM policy directly.


# Alternatives

## Using Saved Objects instead of a new index

See [issue 51223](https://github.com/elastic/kibana/issues/51223) for a
discussion on whether to try to use saved objects as the primary store for
event log documents, versus using a new stand-alone index.

Summary: we'll use a new stand-alone index, but use the "link" saved object
pattern to only allow access via a saved object.  Ie, you will need to have
access to a saved object, to get it's id, to then use in a search through
the event log index.

## Concern with overlap with eventual audit log capability

In an early review, concern was raised that there is a lot of overlap with
where we eventually be with audit logging.

The issues with that are:

- audit logs are currently just an `audit-log` tag on messages written to the
  standard Kibana log; there is no infrastructure to allow them to be queried

- security differences; the users able to read audit logs are probably much
  more constrained than users that need to be able to read these event logs

So, we don't really have an _alternative_ here, but ... a lot of overlap.
Long-term, it may make sense to make the eventual audit logging code 
parameterizable, so that the core code could be used for other purposes, like
this event log.  We're just not there yet.  Or implement the audit log with
the event log :-)

## Write to a events to a file and ingest via FileBeat

This came up as _"why don't we use our own stuff to do this since that's what
it's designed for"_.  Yup!  However, the only thing that really changes over
writing our index is:

- we'd write to some other log (could be console.log, or a file) instead of
  an index, directly
- we'd have to arrange to run FileBeat alongside Kibana, ingesting these
  logged events, which would send them into elasticsearch

We still need to arrange to initialize all the elasticsearch resources (ilm,
index template, etc).

The big kicker though is: where would we right these that FileBeat could
find them?  Writing to a file might be problematic for users that run 
Kibana with no writable file system, including folks using docker-based
deployments.

Lots of unknown unknowns, it seems.

Interestingly enough, this kind of story might work out extremely well for
Elastic Cloud, where we have a lot more control over the deployments!

# Adoption strategy

If we implement this proposal, how will existing Kibana developers adopt it? Is
this a breaking change? Can we write a codemod? Should we coordinate with
other projects or libraries?

The API surface has been kept to a minimum to make it easy for other plugins
make use of it.  But that's just a nice-to-have right now anyway, since 
the only known clients will be actions and alerting.


# How we teach this

**What names and terminology work best for these concepts and why? How is this
idea best presented? As a continuation of existing Kibana patterns?**

"event" and "log" are probably the most controversial names in use here.
Previously, we've referred to this as an "audit log" or "history log".
Audit log is not a great name due to the existance of the audit logging
facility already available in Kibana.  History or History log seems like
a closer fit.  Event log works for me, as it provides just a touch more
information than history - it's a history of events - but of course "events"
as suitable vague enough that it doesn'tt add thatt much more.

**Would the acceptance of this proposal mean the Kibana documentation must be
re-organized or altered? Does it change how Kibana is taught to new developers
at any level?**

no

**How should this feature be taught to existing Kibana developers?**

Follow examples of other plugins using it.

The API surface is very small, it's designed to be easy for other developers
to reuse.


# Unresolved questions

**Optional, but suggested for first drafts. What parts of the design are still
TBD?**

There is a task list of resolved and unresolved TODO items and future-looking
items in the initial event log PR https://github.com/elastic/kibana/issues/45083  