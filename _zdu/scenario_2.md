Scenario 2: new rule type - do APIs to old Kibana work?
========================================================================

The setup is the same as Scenario 2, but once the rule is created,
we'll run some query / mutating APIs on the rule, but sending the
requests to old Kibana, to see what happens.


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

run the script to create the rule and test apis / this branch:

```console
$ _zdu/scenario_2.mjs
```

outcome
------------------------------------------------------------------------

APIs tested:

- disable
- enable
- find
- get
- update
- muteAll
- unmuteAll
- muteAlert
- unmuteAlert
- delete


Same result for all APIs except find:

    {
      "statusCode":400,
      "error":"Bad Request",
      "message":"Rule type \".index-threshold-Jr\" is not registered."
    }

The find API returned

    {
      "statusCode":404,
      "error":"Not Found",
      "message":"Not Found"
    }


changes required
------------------------------------------------------------------------

I'm not sure how much more graceful we can get!  It doesn't seem right
to suggest in a message "is not registered **... yet**".  


et cetera
------------------------------------------------------------------------

Like scenario 1, I expect connectors to have similar issues. Tasks I'm
not sure about, but should try those.