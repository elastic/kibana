Scenario 1: new rule type - will old Kibana run it?
========================================================================

We'll start with a "simple" scenario.  The new version of Kibana has
a new rule type, `.index-threshold-Jr`!  It's added here:

[index_threshold/index.ts](../x-pack/plugins/stack_alerts/server/rule_types/index_threshold/index.ts)

We'll create a rule of this type in a new Kibana while an old one that
doesn't know about this rule type is also running.  What happens???

You'll have one directory that is running kibana on the main branch,
and another running kibana on this branch.  This branch is the new
branch.


directions
------------------------------------------------------------------------

start old ES / main:

```console
$ yarn es snapshot --license trial
```

start old Kibana / main:

```console
$ yarn start --no-base-path --run-examples
```

start new Kibana - on port 15601 / this branch:

```console
$ yarn start --no-base-path --run-examples --port 15601
```

run the script to create the rule / this branch:

```console
$ _zdu/scenario_1.mjs
```

outcome
------------------------------------------------------------------------

From here, the rule starts running, as observed from the new Kibana pages.
The old pages know nothing about this rule!  I think that's good?  Now, 
stop the new server, so the old server is the only one that COULD run
this task.  It never does.  Start the new server again, observe that
it starts running again, and was not running while that server was down.

Surprising success!  I thought we'd mark the new task as unrecognized and
essentially disable it.  But looks like we didn't!

However, there is a problem.  If you get a rule with the new rule type
created, it will display in the new Kibana, but not in the old Kibana.  If
you browse to the rule details in the new Kibana, then copy that URL to
show it in the old Kibana, you'll get an error loading the page.  There's
actually a 400 response somewhere with no details - so there's a bug we
have to fix somewhere.

This is a fairly reasonable scenario.  User creates new rule type in
new Kibana, then as continuing to browse Kibana, could easily get to
the Rules list in new Kibana, click on the new rule, which would get
handled by the old Kibana, and the rule can't be displayed.  Or be
in the Rules detail page for the new rule, and perform an action like
enable/disable.  That will be difficult to recreate, and kinda impossible
in my two server setup - I'd have to have the old Kibana ux fetch to the
new Kibana.  Maybe manually switching the server on 5601.  Yuck.


changes required
------------------------------------------------------------------------

So, how to handle it?

Tolerate the error better in the old client.  Figure out what to do when
encountering rules "from the future" - currently we hide them at times
(rules list) and throw errors at times (rule details).  We should probably
stop hiding them in the rules list, if possible, but how would we display
them?  Same for details, what would we show?

What do we do if you perform an action on the new rule and it gets
handled by the old server?  I guess just a normal "operation failed, try 
again"?

If we wanted to be "perfect", my first thought is that we should 
_delay_ enabling the new rule type until all the old Kibanas stop
running.  That implies a lot of things like the Kibana instance
knowing it's a "new version" and being informed when "all the old
versions" are gone.  Not clear we have those kind of signals.  From
the current "Design - Serverless - Kibana managed upgrades" doc, it
looks like the "migrate" step - either right before or right after - 
or presumably DURING the migrate (which is weird, but if there was
no other way), we know all the nodes are "new" and so have all the 
types.


et cetera
------------------------------------------------------------------------

Since we maintain registries like this for connectors and tasks, they
will likely have similar issues.  Tasks actually already appear to work
as intended, via the test above - the old Kibana did not pick up the
task, nor did it mark it unrecognized.  But ... could be something
else lurking - do task APIs called from old Kibana (indirectly via
enable / disable, etc) work on task types it doesn't know about?

I would expect all the same problems with connectors as discussed above
with rules.  In theory, worse, since connector references become embedded
in rules as actions.  Assuming the 