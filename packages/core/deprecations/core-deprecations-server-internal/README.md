# @kbn/core-deprecations-server-internal

This package contains the internal types and implementation of Core's server-side `deprecations` service.


/** Router:
   * register Usage counters side core setup
   *       DOMIANID: CORE.ROUTER
    * At router definition
    *  Call deprecations.registerDeprecation
    *     - group all renamed etc
    
  * GroupId: Method / path
  * when route is called
    if deprecation is triggered based on rename/ path/ remove
    - increment counter: GroupId, domainId, type: 'count'


set: ['body.a'],
unset: ['body.a'],

{
  "deprecations": [
    {
      "configPath": "xpack.reporting.roles.enabled",
      "title": "The \"xpack.reporting.roles\" setting is deprecated",
      "level": "warning",
      "message": "The default mechanism for Reporting privileges will work differently in future versions, which will affect the behavior of this cluster. Set \"xpack.reporting.roles.enabled\" to \"false\" to adopt the future behavior before upgrading.",
      "correctiveActions": {
        "manualSteps": [
          "Set \"xpack.reporting.roles.enabled\" to \"false\" in kibana.yml.",
          "Remove \"xpack.reporting.roles.allow\" in kibana.yml, if present.",
          "Go to Management > Security > Roles to create one or more roles that grant the Kibana application privilege for Reporting.",
          "Grant Reporting privileges to users by assigning one of the new roles."
        ],
        api: {
          path: 'some-path',
          method: 'POST',
          body: {
            extra_param: 123,
          },
        },
      },
      "deprecationType": "config",
      "requireRestart": true,
      "domainId": "xpack.reporting"
    }
  ]
}


domainId: 'routesDeprecations'
counterName: '{RouteAPIGroupingID}',
counterType: 'count',

RouteAPIGroupingID
If Route level: method, route

For fixed:
counterType: 'count:fixed',

We count all deprecations

{
  'RouteAPIGroupingID': {
    message: '',
    deprecationDetails
  }
}


Approach 1:
In memory:
1. Store in memory the deprecation details defined at routes setup

3. enrich some text (last called etc) filter out diff 0
4. send result

SO and get rid of Usage counter

interface UsageCountersParams {
  /** The domainId used to create the Counter API */
  domainId: string;
  /** The name of the counter. Optional, will return all counters in the same domainId that match the rest of filters if omitted */
  counterName?: string;
  /** The 2. on UA api call we do matching between usage counters and the deprecation details in memorytype of counter. Optional, will return all counters in the same domainId that match the rest of filters if omitted */
  counterType?: string;
  /** Namespace of the counter. Optional, counters of the 'default' namespace will be returned if omitted */
  namespace?: string;
}
