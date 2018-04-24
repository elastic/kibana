Saved Objects Service
=========
Avoid request scoped services https://github.com/elastic/kibana/pull/14482
Saved object service https://github.com/elastic/kibana/pull/15739

History: when we last worked on saved objects client
---------
  - tribe support + compatibility layer
  - first time we ever made an effort to create one set of abstractions for saved objects

Why now?
---------
 - new things need a standard set of abstractions for SOs
   - Global extensions to SOS:
     - OLS
     - migrations
     - tagging (newer)
   - Users of SOS that should receive global extensions:
     - logstash pipelines (a new type)
     - canvas workpads
     - reporting jobs
 - Close the gaping holes leaking the abstractions into the rest of kibana
     - When we create tagging/ols/etc, let's do it through the new abstractions
     - We solve the problem of new features without clobbering each other

Security
---------
Any time you do a find, you decorate the request with auth. Doesn't want to load all possible results into memory from ES. Wants to put an extra filter on the request to ES.

But, people can access Kibana saved objects bypassing the SOS. Blown wide open.

So that means security plugin needs to always go through the SOS.

Migrations
---------
Migrations need to be able to work across the complete life cycle of all saved objects, because it needs to make assumptions about the current state of saved objects in order to make viable changes to them. At no time should a user be able to do anything the migration system doesn't anticipate.

Security + Migrations
---------
Security needs to apply its own metadata, global mappings for all saved objects. When the plugin starts up, it needs to apply mappings on all existing object types.

We don't know in advance of the plugin starting up if we need to write this metadata. It makes sense that it has to happen when X-Pack Security starts.

Security owns these mappings. Deal directly with ES mappings, have the plugin apply those mappings directly into the kibana index. No mechanism through the SOS. Leak the abstraction type details into the security plugin from the current SOS.

ES mappings is the language we provide today. Our SO details are leaking outside of the SO abstractions because it's the only way to make real changes to them.

Canvas
---------
Workpad type.
Apply the OLS metadata, ok.
Canvas has to add a new field in a new version.
Canvas would have to say, "use these mappings for my canvas workpad instead"
Now the OLS mappings are gone.
Or maybe Security needs to re-apply its mapping changes after all the plugins are done making changes.

Either way, a plugin version change that triggers Migrations to make changes to mappings could break the SO mappings.

But this is the case only because both OLS and Migrations are making changes to the same ES mappings. What if we could have a protective mechanism within SOS that gracefully handles mapping changes before they are committed to ES?

Initial definition of saved objects, maybe they're the same as the mapping abstraction of saved objects.

Hm... a proper order that plugins make changes could solve the problem of clobbering mappings, before they get applied on the ES side.

Tags
---------
We want to apply tags globally. Tagging feature that other plugins opt-in to them? Or maybe if they're in X-Pack, they have to be applied to al saved objects and choose how to expose them? Either way, modifications to underlying objects applied broadly. It can tag any type, but it cannot know about all the types that need to be tagged. Just has the capability to tag any type.

You could still ultimately lose data with security and migrations in play with tags, unless all are brought together into the same system.

Saved Objects System
---------
Exposes a saved objects service that runs, has lifecycle methods, and manages all the operations and extension points and config options.

It exposes three clients for use by plugins. These three interfaces encompass _all_ saved object access.

1. Saved object client given to an HTTP request handler. Allows you to find, create, update saved objects.
2. Migrations client. Bulk transformation of saved objects and mappings. Not just one-off updates, but  permanent modifications into the future to the way saved objects behave.
3. Plugin contract/interface. Extension points for plugins to inject functionality into the internals, specifically wiring into saved objects service and migrations client.

Storage - Logstash, Beats(, Monitoring?)
---------
If all that is done gracefully, then storage becomes just an implementation detail. We don't need to limit ourselves to just a single `.kibana` index. We have a system that migrates, applies OLS, has reliable abstractions for saved objects.

When you define a type through our saved object system, as part of that type configuration, you describe the storage behaviors for that type. Certain types, like reporting jobs (noisy) can be balanced across weekly indices, and less noisy dashboards can be dumped into the `.kibana` index. But it doesn't matter where these objects are stored because that's just an implementation detail. That storage strategy/location is locked to the consumer specifying the behavior and type (in this case, the plugin).

You, the user, can access your data, but all your admin stuff stored for the sake of consuming Kibana features, is all done through the Saved Object Service. The whole index needs to opt into being managed by Kibana; it cannot just be some part of documents of an index. An index is either managed by Kibana or not. The benefit is you get OLS, migration support, tags, whether in Kibana index or other index.

Some implementation questions
---------
#### Performance
Is slowness an issue for migrating mappings for five years worth of reporting jobs?

Even if we did a fallback to a _reindex or some ES API, that should still be an implementation detail. User says "I want a performant migration" which means user isn't modifying the actual Kibana objects in ES, or touching any Kibana primitives. We'll doing that behind the scenes.

#### X-Pack Indices
X-Pack-Elasticsearch manages monitoring, beats, logstash indices. So now these have to be managed by Kibana? Monitoring cannot fall under this model because monitoring indices need to be able to be created at any time, not just when Kibana can do it.

If Kibana manages an index, it also has to manage that index's creation.

#### Current search/find in Saved Object Client
Search/find saved objects is very simple. The Saved Object Service could provide more capabilities to build a more interesting search query.

### Integration testing
This approach makes it really easy to test the clients exposed by the Saved Object System. Start up saved object service, take a client from it, do a bunch of integration testing on it without ever running other plugins or Kibana itself. This would be relatively low level integration testing: only testing the interface between that client and Elasticsearch. (We'd have other larger swaths of Kibana getting integration tested.)

The three clients themselves
---------
The migrations client and saved object client probably share important internal details.
The plugin contract exposes some extension points that give you the migration client or give you the saved object client.
Each plugin can configure that it depends on these two clients, and they are made available from the saved object service, which is exposed on probably Kibana core.

I think this means the plugin contract is always available globally, so that plugins can use it. So would it be outside of the Saved Object Service?

The different things we want plugins to configure for saved objects:

**Migrations.** You give us a function which takes in a migration client, and it has a registerMigration function that takes in a name and an action to run, for example.

**Http service.** The plugin system could wire itself into the Http service, so every single handler gets pre-seeded with the relevant information from the request to map to a Kibana user so we can do auth for OLS.

Hmmmm. This is the thing I think we should do more cleanly. There's got to be a way to provide the relevant information without passing in the huge request object to middleware, and without exposing the `getSavedObjectsClient` on the server object or the request object. You register an endpoint along with the handler for that endpoint. You define the handler to explicitly pass headers from the request to the saved object client factory, which then provides a client bound to those headers.

Define a plugin that has only dependencies on Kibana core, and no other plugin dependencies.

```js
// baz/index.js
import { KibanaPluginConfig } from '@kbn/types';
import { registerEndpoints } from './register_endpoints';

export const plugin: KibanaPluginConfig<{}> = {
  plugin: kibana => {
    // Grab components you need from Kibana core
    const { elasticsearch, logger, http } = kibana;
    const config$ = kibana.kibana.config$;

    const log = logger.get();

    log.info('create Baz plugin');

    // Register a router upon which to attach handlers
    const router = http.createAndRegisterRouter('/api/baz');

    log.info('register Baz endpoints');

    // Start defining handlers
    registerEndpoints(router, logger, elasticsearch.service, config$);
  },
};

```

Registering an endpoint lets you define what to expect from the request, validating those parts of the request, and how to handle the request. The handler can define a Saved Object Client

```js
// baz/register_endpoints.js
export function registerEndpoints(
  router:        Router,
  logger:        LoggerFactory,
  elasticsearch: ElasticsearchService,
  config$:       Observable<KibanaConfig>
) {
  const log = logger.get('routes');

  // Example of what happens when an endpoint fails on validation
  router.get(
    {
      path: '/fail',
      validate: false,
    },
    async (req, res) => {
      log.info(`GET should fail`);

      return res.badRequest(new Error('nope'));
    }
  );

  // Example of an endpoint that validates
  router.get(
    {
      path: '/:type',
      // schema lib can be injected
      validate: schema => ({
        params: schema.object({
          type: schema.string(),
        }),
        query: schema.object({
          page: schema.maybe(
            schema.number({
              min: 1,
            })
          ),
          per_page: schema.maybe(
            schema.number({
              min: 1,
            })
          ),
        }),
      }),
    },
    // handler is just like normal middleware
    async (req, res) => {
      log.info('handle Baz route');

      // the only things available on request because only what's validated is offered
      const { params, query } = req;

      log.info('create Baz Service instance');

      // Example of using a Data Client scoped to a request, given its headers
      const client = await elasticsearch.getScopedDataClient(req.headers);

      // Initialize a service that this plugin needs
      // using the Elasticsearch client that access the right cluster,
      // and that is scoped correctly (to the user)
      const bazService = new BazService(client, config$);

      log.info('use Baz Service instance to hit elasticsearch with the right cluster');

      // bazService defines find() method that calls client.call(`endpoint`, params)
      // Behind the scenes, the saved object client executes the call with OLS
      const items = await bazService.find({
        type: params.type,
        page: query.page,
        perPage: query.per_page,
      });

      return res.ok(items);
    }
  );
}
```

BazService is just a backend service that the plugin defines. It can use the saved objects client to do stuff.

```js
// baz/BazService.js
export class BazService {
  // BazService has private members ScopedDataClient and config
  constructor(
    private readonly client: ScopedDataClient,
    private readonly kibanaConfig$: Observable<KibanaConfig>
  ) {}

  // Define a simple find method
  async find(options: { type: string; page?: number; perPage?: number }) {
    const { page = 1, perPage = 20, type } = options;

    const [kibanaIndex] = await latestValues(
      k$(this.kibanaConfig$)(map(config => config.index))
    );

    // Use the ScopedDataClient to make the request
    const response = await this.client.call('endpoint', {
      index: kibanaIndex,
      type,
      size: perPage,
      from: perPage * (page - 1),
    });

    const data = response.hits.hits.map((hit: any) => ({
      id: hit._id,
      type: hit._type,
      version: hit._version,
      attributes: hit._source,
    }));

    return {
      data,
      total: response.hits.total,
      per_page: perPage,
      page: page,
    };
  }
}
```

To see an implementation of ElasticsearchService and the different ways we can provide Elasticsearch via an Admin or Data Client, peruse [this directory](https://github.com/elastic/kibana/tree/new-platform/platform/src/server/elasticsearch).

Spaces
---------
[Spaces issue](https://github.com/elastic/x-pack-kibana/issues/774)

From a saved object standpoint, Spaces will be represented as individual saved objects of type `space`
and things like dashboards will have a `space id` stored on them.

X-Pack Security will extend the saved object client to take into account `space id` in all relevant places.

Court's draft
---------
 - originally sketched around how OLS can use nested saved object references
   - formal notion of types
   - the store itself, not just .kibana
 - configure saved objects client
 - define ownership of SO types at plugin boundaries
 - define storage/mapping/settings by type (e.g. for reporting)
 - the above can be used for:
   - migrations
   - import/export

How would a tag plugin work? It could give me saved objects and invoke a function that lets me decorate saved objects with tags. We probably want to do validation, error if tags are already decorated. Then expose a generic tags API. Register a router on the http service, which is provided by Kibana core. The handler grabs the saved object client from Kibana core (probably), which is initialized with request headers and an elasticsearch service (exposed by Kibana core also). You then do a normal `find` operation on tag. Wire it up so that the `find` function knows the passed in type is tag.

**Security plugin.** Configure it with some complicated OLS metadata in `registerSavedObjectMetadata`. Start up security plugin. Wire into the core saved object service. Apply your extensions. `registerFindMiddleware` to inject Security specific hooks into the `find` method in the saved objects service. Like additional filters for every find, update, or create request. Doesn't have to be this implementation, but some way to hook into existing saved object methods and inject some extra stuff a plugin may need to do.

**Dashboards.** If you have no global concerns, but you have a subset of objects of a particular type that you care about, like dashboard plugin, you can specify a schema for the new type and tell the saved objects service about it. And that type will now be available. Dashboard type has dependency on visualization type, so you do `const visualizationtype = vizDep.getSavedObjectType()`, where `vizDep` is pulled out of dependencies. Need to be able to specify validation rules for the new type defined for a plugin.

A lot of features depend on how saved objects service is implemented, but OLS cannot be blocked on this.
Is there a way I could write a shell of Saved Objects Service that lets migrations be exposed before the core of saved objects system is written? I don't know. It will have dependencies on the internals.

Develop the core internal service and how it gets plugged. The migrations client just fits into that. What the migration client exposes is probably totally separate from what the core service needs to care about. But again, what it uses internally will matter in the design of both the core service and the migrations client.

OSS vs X-Pack
---------
There may be a set of extension points that only make sense for X-Pack, particularly Security, so some of this project could live in X-Pack. We don't want Dashboards to say, "oh, you have X-Pack installed, so add tags to dashboards." If that needs to happen, it should go through something that lives entirely within X-Pack.

Tagging
---------
Wait until the core service is done. So it's blocked on it. The discussion blew up around Tags and Security. Now Tags are "Security Groups." Better that it's on hold for the moment so when we dive back into tagging its scope will be clearer.

Nesting problem
---------
Dashboard shouldn't create a dependency between its dashboard object and visualize object. So we use DI to resolve that. The visualize plugin exposes on its contract the schemas that dashboards can use. It's possible the user could get all visualizations by going through a "dashboard" plugin, without specifying a dependency on the visualize plugin. It would be really nice to somehow prevent this. But at least in our implementation we should define the dependency so that it's not normally possible. What visualizations come back via the dashboard plugin should be from methods exposed by the visualize plugin.

