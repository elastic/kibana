// Load modules

var Os = require('os');


// Declare internals

var internals = {};


exports.server = {
    debug: {
        request: ['implementation'],
        log: ['implementation']
    },
    load: {
        sampleInterval: 0
    },
    mime: null,                                     // Mimos options
    minimal: false,
    files: {
        etagsCacheMaxSize: 10000                    // Maximum number of etags in the cache
    }
};


exports.connection = {
    router: {
        isCaseSensitive: true,                      // Case-sensitive paths
        stripTrailingSlash: false                   // Remove trailing slash from incoming paths
    },
    routes: {
        cache: {
            statuses: [200]                         // Array of HTTP status codes for which cache-control header is set
        },
        cors: false,                                // CORS headers
        files: {
            relativeTo: '.'                         // Determines what file and directory handlers use to base relative paths off
        },
        json: {
            replacer: null,
            space: null,
            suffix: null
        },
        payload: {
            failAction: 'error',
            maxBytes: 1024 * 1024,
            output: 'data',
            parse: true,
            timeout: 10 * 1000,                     // Determines how long to wait for receiving client payload. Defaults to 10 seconds
            uploads: Os.tmpDir()
        },
        response: {
            options: {}                             // Joi validation options
        },
        security: false,                            // Security headers on responses: false -> null, true -> defaults, {} -> override defaults
        state: {
            parse: true,                            // Parse content of req.headers.cookie
            failAction: 'error'                     // Action on bad cookie - 'error': return 400, 'log': log and continue, 'ignore': continue
        },
        timeout: {
            socket: undefined,                      // Determines how long before closing request socket. Defaults to node (2 minutes)
            server: false                           // Determines how long to wait for server request processing. Disabled by default
        },
        validate: {
            options: {}                             // Joi validation options
        }
    }
};


exports.security = {
    hsts: 15768000,
    xframe: 'deny',
    xss: true,
    noOpen: true,
    noSniff: true
};


exports.cors = {
    origin: ['*'],
    isOriginExposed: true,                          // Return the list of supported origins if incoming origin does not match
    matchOrigin: true,                              // Attempt to match incoming origin against allowed values and return narrow response
    maxAge: 86400,                                  // One day
    headers: [
        'Authorization',
        'Content-Type',
        'If-None-Match'
    ],
    additionalHeaders: [],
    methods: [
        'GET',
        'HEAD',
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
        'OPTIONS'
    ],
    additionalMethods: [],
    exposedHeaders: [
        'WWW-Authenticate',
        'Server-Authorization'
    ],
    additionalExposedHeaders: [],
    credentials: false,
    override: true
};
