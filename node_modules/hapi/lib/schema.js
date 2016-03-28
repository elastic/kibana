// Load modules

var Joi = require('joi');
var Hoek = require('hoek');


// Declare internals

var internals = {};


exports.assert = function (type, options, message) {

    var result = Joi.validate(options, internals[type]);
    Hoek.assert(!result.error, 'Invalid', type, 'options', message ? '(' + message + ')' : '', result.error && result.error.annotate());
    return result.value;
};


internals.cache = Joi.object({
    name: Joi.string().invalid('_default'),
    partition: Joi.string(),
    shared: Joi.boolean(),
    engine: Joi.alternatives([
        Joi.object(),
        Joi.func()
    ])
        .required()
}).unknown();


internals.auth = Joi.alternatives([
    Joi.string(),
    Joi.object({
        mode: Joi.string().valid('required', 'optional', 'try'),
        scope: Joi.alternatives([
            Joi.string(),
            Joi.array()
        ])
            .allow(false),
        entity: Joi.string().valid('user', 'app', 'any'),
        strategy: Joi.string(),
        strategies: Joi.array().min(1),
        payload: [
            Joi.string().valid('required', 'optional'),
            Joi.boolean()
        ]
    })
        .without('strategy', 'strategies')
]);


internals.routeBase = Joi.object({
    app: Joi.object().allow(null),
    auth: internals.auth.allow(false),
    bind: Joi.object().allow(null),
    cache: Joi.object({
        expiresIn: Joi.number(),
        expiresAt: Joi.string(),
        privacy: Joi.string().valid('default', 'public', 'private'),
        statuses: Joi.array().items(Joi.number().integer().min(200)).min(1)
    }),
    cors: Joi.object({
        origin: Joi.array(),
        matchOrigin: Joi.boolean(),
        isOriginExposed: Joi.boolean(),
        maxAge: Joi.number(),
        headers: Joi.array(),
        additionalHeaders: Joi.array(),
        methods: Joi.array(),
        additionalMethods: Joi.array(),
        exposedHeaders: Joi.array(),
        additionalExposedHeaders: Joi.array(),
        credentials: Joi.boolean(),
        override: Joi.boolean()
    })
        .allow(null, false, true),
    files: Joi.object({
        relativeTo: Joi.string().regex(/^([\/\.])|([A-Za-z]:\\)|(\\\\)/).required()
    }),
    json: Joi.object({
        replacer: Joi.alternatives(Joi.func(), Joi.array()).allow(null),
        space: Joi.number().allow(null),
        suffix: Joi.string().allow(null)
    }),
    jsonp: Joi.string(),
    payload: Joi.object({
        output: Joi.string().valid('data', 'stream', 'file'),
        parse: Joi.boolean().allow('gunzip'),
        allow: [
            Joi.string(),
            Joi.array()
        ],
        override: Joi.string(),
        maxBytes: Joi.number(),
        uploads: Joi.string(),
        failAction: Joi.string().valid('error', 'log', 'ignore'),
        timeout: Joi.number().integer().positive().allow(false),
        qs: Joi.object()
    }),
    plugins: Joi.object(),
    response: Joi.object({
        schema: Joi.alternatives(Joi.object(), Joi.func()).allow(true, false),
        status: Joi.object().pattern(/\d\d\d/, Joi.alternatives(Joi.object(), Joi.func()).allow(true, false)),
        sample: Joi.number().min(0).max(100),
        failAction: Joi.string().valid('error', 'log'),
        modify: Joi.boolean(),
        options: Joi.object()
    })
        .without('modify', 'sample'),
    security: Joi.object({
        hsts: [
            Joi.object({
                maxAge: Joi.number(),
                includeSubdomains: Joi.boolean()
            }),
            Joi.boolean(),
            Joi.number()
        ],
        xframe: [
            Joi.boolean(),
            Joi.string().valid('sameorigin', 'deny'),
            Joi.object({
                rule: Joi.string().valid('sameorigin', 'deny', 'allow-from'),
                source: Joi.string()
            })
        ],
        xss: Joi.boolean(),
        noOpen: Joi.boolean(),
        noSniff: Joi.boolean()
    })
        .allow(null, false, true),
    state: Joi.object({
        parse: Joi.boolean(),
        failAction: Joi.string().valid('error', 'log', 'ignore')
    }),
    timeout: Joi.object({
        socket: Joi.number().integer().positive().allow(false),
        server: Joi.number().integer().positive().allow(false).required()
    }),
    validate: Joi.object({
        headers: Joi.alternatives(Joi.object(), Joi.func()).allow(null, false, true),
        params: Joi.alternatives(Joi.object(), Joi.func()).allow(null, false, true),
        query: Joi.alternatives(Joi.object(), Joi.func()).allow(null, false, true),
        payload: Joi.alternatives(Joi.object(), Joi.func()).allow(null, false, true),
        failAction: [
            Joi.string().valid('error', 'log', 'ignore'),
            Joi.func()
        ],
        errorFields: Joi.object(),
        options: Joi.object()
    })
});


internals.connectionBase = Joi.object({
    app: Joi.object().allow(null),
    load: Joi.object(),
    plugins: Joi.object(),
    query: Joi.object({
        qs: Joi.object()
    }),
    router: Joi.object({
        isCaseSensitive: Joi.boolean(),
        stripTrailingSlash: Joi.boolean()
    }),
    routes: internals.routeBase,
    state: Joi.object()                                     // Cookie defaults
});


internals.server = Joi.object({
    app: Joi.object().allow(null),
    cache: Joi.alternatives([
        Joi.func(),
        internals.cache,
        Joi.array().items(internals.cache).min(1)
    ]).allow(null),
    connections: internals.connectionBase,
    debug: Joi.object({
        request: Joi.array().allow(false),
        log: Joi.array().allow(false)
    }).allow(false),
    files: Joi.object({
        etagsCacheMaxSize: Joi.number().min(0)
    }),
    load: Joi.object(),
    mime: Joi.object(),
    minimal: Joi.boolean(),
    plugins: Joi.object()
});


internals.connection = internals.connectionBase.keys({
    autoListen: Joi.boolean(),
    host: Joi.string().hostname(),
    address: Joi.string().hostname(),
    labels: Joi.array().items(Joi.string()).single(),
    listener: Joi.any(),
    port: Joi.alternatives([
        Joi.number().integer().min(0),          // TCP port
        Joi.string().regex(/\//),               // Unix domain socket
        Joi.string().regex(/^\\\\\.\\pipe\\/)   // Windows named pipe
    ])
        .allow(null),
    tls: Joi.alternatives([
        Joi.object().allow(null),
        Joi.boolean()
    ]),
    uri: Joi.string().regex(/[^/]$/)
});


internals.vhost = Joi.alternatives([
    Joi.string().hostname(),
    Joi.array().items(Joi.string().hostname()).min(1)
]);


internals.route = Joi.object({
    method: Joi.string().required(),
    path: Joi.string().required(),
    vhost: internals.vhost,
    handler: Joi.any(),                         // Validated in route.config
    config: Joi.object().allow(null)
});


internals.pre = [
    Joi.string(),
    Joi.func(),
    Joi.object({
        method: Joi.alternatives(Joi.string(), Joi.func()).required(),
        assign: Joi.string(),
        mode: Joi.string().valid('serial', 'parallel'),
        failAction: Joi.string().valid('error', 'log', 'ignore')
    })
];


internals.routeConfig = internals.routeBase.keys({
    id: Joi.string(),
    pre: Joi.array().items(internals.pre.concat(Joi.array().items(internals.pre).min(1))),
    handler: [
        Joi.func(),
        Joi.string(),
        Joi.object().length(1)
    ],
    description: Joi.string(),
    notes: [
        Joi.string(),
        Joi.array().items(Joi.string())
    ],
    tags: [
        Joi.string(),
        Joi.array().items(Joi.string())
    ]
});


internals.cachePolicy = Joi.object({
    cache: Joi.string().allow(null).allow(''),
    segment: Joi.string(),
    shared: Joi.boolean()
})
    .options({ allowUnknown: true });               // Catbox validates other keys


internals.method = Joi.object({
    bind: Joi.object().allow(null),
    generateKey: Joi.func(),
    cache: internals.cachePolicy,
    callback: Joi.boolean()
});


internals.register = Joi.object({
    routes: Joi.object({
        prefix: Joi.string().regex(/^\/.+/),
        vhost: internals.vhost
    }),
    select: Joi.array().items(Joi.string()).single()
});

internals.dependencies = Joi.array().items(Joi.string()).single();
