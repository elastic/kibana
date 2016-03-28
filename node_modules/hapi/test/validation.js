// Load modules

var Boom = require('boom');
var Code = require('code');
var Lab = require('lab');
var Joi = require('joi');
var Hapi = require('..');


// Declare internals

var internals = {};


// Test shortcuts

var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var expect = Code.expect;


describe('validation', function () {

    it('validates valid input', function (done) {

        var server = new Hapi.Server();
        server.connection();
        server.route({
            method: 'GET',
            path: '/',
            handler: function (request, reply) {

                return reply('ok');
            },
            config: {
                validate: {
                    query: {
                        a: Joi.number()
                    }
                }
            }
        });

        server.inject('/?a=123', function (res) {

            expect(res.statusCode).to.equal(200);
            done();
        });
    });

    it('validates both params and query', function (done) {

        var server = new Hapi.Server();
        server.connection();
        server.route({
            method: 'GET',
            path: '/b/{x}',
            handler: function (request, reply) {

                return reply(request.params.x + request.query.a);
            },
            config: {
                validate: {
                    query: {
                        a: Joi.number().integer().min(0).default(0)
                    },
                    params: {
                        x: Joi.number()
                    }
                }
            }
        });

        server.inject('/b/456?a=123', function (res) {

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal(579);
            done();
        });
    });

    it('validates valid input using context', function (done) {

        var server = new Hapi.Server();
        server.connection();
        server.route({
            method: 'GET',
            path: '/{user?}',
            handler: function (request, reply) {

                return reply('ok');
            },
            config: {
                validate: {
                    query: {
                        verbose: Joi.boolean().when('$params.user', { is: Joi.exist(), otherwise: Joi.forbidden() })
                    }
                }
            }
        });

        server.inject('/?verbose=true', function (res1) {

            expect(res1.statusCode).to.equal(400);

            server.inject('/', function (res2) {

                expect(res2.statusCode).to.equal(200);

                server.inject('/steve?verbose=true', function (res3) {

                    expect(res3.statusCode).to.equal(200);

                    server.inject('/steve?verbose=x', function (res4) {

                        expect(res4.statusCode).to.equal(400);
                        done();
                    });
                });
            });
        });
    });

    it('validates valid input using auth context', function (done) {

        var server = new Hapi.Server();
        server.connection();

        server.auth.scheme('none', function (authServer, options) {

            return {
                authenticate: function (request, reply) {

                    return reply.continue({ credentials: { name: 'john' } });
                }
            };
        });

        server.auth.strategy('default', 'none', true);

        server.route({
            method: 'GET',
            path: '/{user?}',
            handler: function (request, reply) {

                return reply('ok');
            },
            config: {
                validate: {
                    query: {
                        me: Joi.boolean().when('$auth.credentials.name', { is: Joi.ref('$params.user'), otherwise: Joi.forbidden() })
                    }
                }
            }
        });

        server.inject('/?me=true', function (res1) {

            expect(res1.statusCode).to.equal(400);

            server.inject('/', function (res2) {

                expect(res2.statusCode).to.equal(200);

                server.inject('/steve?me=true', function (res3) {

                    expect(res3.statusCode).to.equal(400);

                    server.inject('/john?me=true', function (res4) {

                        expect(res4.statusCode).to.equal(200);

                        server.inject('/john?me=x', function (res5) {

                            expect(res5.statusCode).to.equal(400);
                            done();
                        });
                    });
                });
            });
        });
    });

    it('fails valid input', function (done) {

        var server = new Hapi.Server();
        server.connection();
        server.route({
            method: 'GET',
            path: '/',
            handler: function (request, reply) {

                return reply('ok');
            },
            config: {
                validate: {
                    query: {
                        a: Joi.number()
                    }
                }
            }
        });

        server.inject('/?a=abc', function (res) {

            expect(res.statusCode).to.equal(400);
            done();
        });
    });

    it('validates valid input with validation options', function (done) {

        var server = new Hapi.Server();
        server.connection({ routes: { validate: { options: { convert: false } } } });
        server.route({
            method: 'GET',
            path: '/',
            handler: function (request, reply) {

                return reply('ok');
            },
            config: {
                validate: {
                    query: {
                        a: Joi.number()
                    }
                }
            }
        });

        server.inject('/?a=123', function (res) {

            expect(res.statusCode).to.equal(400);
            done();
        });
    });

    it('allows any input when set to null', function (done) {

        var server = new Hapi.Server();
        server.connection();
        server.route({
            method: 'GET',
            path: '/',
            handler: function (request, reply) {

                return reply('ok');
            },
            config: {
                validate: {
                    query: null
                }
            }
        });

        server.inject('/?a=123', function (res) {

            expect(res.statusCode).to.equal(200);
            done();
        });
    });

    it('validates using custom validation', function (done) {

        var server = new Hapi.Server();
        server.connection();
        server.route({
            method: 'GET',
            path: '/',
            handler: function (request, reply) {

                return reply('ok');
            },
            config: {
                validate: {
                    query: function (value, options, next) {

                        return next(value.a === '123' ? null : new Error('Bad query'));
                    }
                }
            }
        });

        server.inject('/?a=123', function (res1) {

            expect(res1.statusCode).to.equal(200);

            server.inject('/?a=456', function (res2) {

                expect(res2.statusCode).to.equal(400);
                expect(res2.result.message).to.equal('Bad query');
                done();
            });
        });
    });

    it('catches error thrown in custom validation', function (done) {

        var server = new Hapi.Server({ debug: false });
        server.connection();
        server.route({
            method: 'GET',
            path: '/',
            handler: function (request, reply) {

                return reply('ok');
            },
            config: {
                validate: {
                    query: function (value, options, next) {

                        throw new Error('Bad query');
                    }
                }
            }
        });

        server.inject('/?a=456', function (res) {

            expect(res.statusCode).to.equal(500);
            done();
        });
    });

    it('casts input to desired type', function (done) {

        var server = new Hapi.Server();
        server.connection();
        server.route({
            method: 'GET',
            path: '/{seq}',
            handler: function (request, reply) {

                return reply(request.params.seq + 1);
            },
            config: {
                validate: {
                    params: {
                        seq: Joi.number()
                    }
                }
            }
        });

        server.inject('/10', function (res) {

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal(11);
            done();
        });
    });

    it('uses original value before schema conversion', function (done) {

        var server = new Hapi.Server();
        server.connection();
        server.route({
            method: 'GET',
            path: '/{seq}',
            handler: function (request, reply) {

                return reply(request.orig.params.seq + 1);
            },
            config: {
                validate: {
                    params: {
                        seq: Joi.number()
                    }
                }
            }
        });

        server.inject('/10', function (res) {

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal('101');
            done();
        });
    });

    it('invalidates forbidden input', function (done) {

        var server = new Hapi.Server();
        server.connection();
        server.route({
            method: 'GET',
            path: '/',
            handler: function (request, reply) {

                return reply('ok');
            },
            config: {
                validate: {
                    query: false
                }
            }
        });

        server.inject('/?a=123', function (res) {

            expect(res.statusCode).to.equal(400);
            done();
        });
    });

    it('retains the validation error', function (done) {

        var server = new Hapi.Server();
        server.connection();
        server.route({
            method: 'GET',
            path: '/',
            handler: function (request, reply) {

                return reply('ok');
            },
            config: {
                validate: {
                    query: false
                }
            }
        });

        server.ext('onPreResponse', function (request, reply) {

            return reply(request.response.data.details[0].path);
        });

        server.inject('/?a=123', function (res) {

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal('a');
            done();
        });
    });

    it('validates valid input (Object root)', function (done) {

        var server = new Hapi.Server();
        server.connection();
        server.route({
            method: 'GET',
            path: '/',
            handler: function (request, reply) {

                return reply('ok');
            },
            config: {
                validate: {
                    query: Joi.object({
                        a: Joi.string().min(2)
                    })
                }
            }
        });

        server.inject('/?a=123', function (res) {

            expect(res.statusCode).to.equal(200);
            done();
        });
    });

    it('fails on invalid input', function (done) {

        var server = new Hapi.Server();
        server.connection();
        server.route({
            method: 'GET',
            path: '/',
            handler: function (request, reply) {

                return reply('ok');
            },
            config: {
                validate: {
                    query: {
                        a: Joi.string().min(2)
                    }
                }
            }
        });

        server.inject('/?a=1', function (res) {

            expect(res.statusCode).to.equal(400);
            expect(res.result.validation).to.deep.equal({
                source: 'query',
                keys: ['a']
            });

            done();
        });
    });

    it('ignores invalid input', function (done) {

        var server = new Hapi.Server();
        server.connection();
        server.route({
            method: 'GET',
            path: '/',
            handler: function (request, reply) {

                return reply('ok');
            },
            config: {
                validate: {
                    query: {
                        a: Joi.string().min(2)
                    },
                    failAction: 'ignore'
                }
            }
        });

        server.inject('/?a=1', function (res) {

            expect(res.statusCode).to.equal(200);
            done();
        });
    });

    it('logs invalid input', function (done) {

        var handler = function (request, reply) {

            var item = request.getLog('validation')[0];
            return reply(item);
        };

        var server = new Hapi.Server();
        server.connection();
        server.route({
            method: 'GET',
            path: '/',
            handler: handler,
            config: {
                validate: {
                    query: {
                        a: Joi.string().min(2)
                    },
                    failAction: 'log'
                }
            }
        });

        server.inject('/?a=1', function (res) {

            expect(res.statusCode).to.equal(200);
            expect(res.result.data.output.payload.message).to.deep.equal('child "a" fails because ["a" length must be at least 2 characters long]');
            done();
        });
    });

    it('replaces error with message on invalid input', function (done) {

        var server = new Hapi.Server();
        server.connection();
        server.route({
            method: 'GET',
            path: '/',
            handler: function (request, reply) {

                return reply('ok');
            },
            config: {
                validate: {
                    query: {
                        a: Joi.string().min(2)
                    },
                    failAction: function (request, reply, source, error) {

                        return reply('Got error in ' + source + ' where ' + error.output.payload.validation.keys[0] + ' is bad').code(400);
                    }
                }
            }
        });

        server.inject('/?a=1', function (res) {

            expect(res.statusCode).to.equal(400);
            expect(res.result).to.equal('Got error in query where a is bad');
            done();
        });
    });

    it('catches error thrown in failAction', function (done) {

        var server = new Hapi.Server({ debug: false });
        server.connection();
        server.route({
            method: 'GET',
            path: '/',
            handler: function (request, reply) {

                return reply('ok');
            },
            config: {
                validate: {
                    query: {
                        a: Joi.string().min(2)
                    },
                    failAction: function (request, reply, source, error) {

                        throw new Error('my bad');
                    }
                }
            }
        });

        server.inject('/?a=1', function (res) {

            expect(res.statusCode).to.equal(500);
            done();
        });
    });

    it('customizes error on invalid input', function (done) {

        var server = new Hapi.Server();
        server.connection();
        server.route({
            method: 'GET',
            path: '/',
            handler: function (request, reply) {

                return reply('ok');
            },
            config: {
                validate: {
                    query: {
                        a: Joi.string().min(2)
                    },
                    errorFields: {
                        walt: 'jr'
                    }
                }
            }
        });

        server.inject('/?a=1', function (res) {

            expect(res.statusCode).to.equal(400);
            expect(res.result).to.deep.equal({
                statusCode: 400,
                error: 'Bad Request',
                message: 'child "a" fails because ["a" length must be at least 2 characters long]',
                validation: {
                    source: 'query',
                    keys: ['a']
                },
                walt: 'jr'
            });

            done();
        });
    });

    it('fails on invalid payload', function (done) {

        var server = new Hapi.Server();
        server.connection();
        server.route({
            method: 'POST',
            path: '/',
            handler: function (request, reply) {

                return reply('ok');
            },
            config: {
                validate: {
                    payload: {
                        a: Joi.string().min(8)
                    }
                }
            }
        });

        server.inject({ method: 'POST', url: '/', payload: '{"a":"abc"}', headers: { 'content-type': 'application/json' } }, function (res) {

            expect(res.statusCode).to.equal(400);
            expect(res.result.validation).to.deep.equal({
                source: 'payload',
                keys: ['a']
            });

            done();
        });
    });

    it('fails on text input', function (done) {

        var server = new Hapi.Server();
        server.connection();
        server.route({
            method: 'POST',
            path: '/',
            handler: function (request, reply) {

                return reply('ok');
            },
            config: {
                validate: {
                    payload: {
                        a: Joi.string().min(2)
                    }
                }
            }
        });

        server.inject({ method: 'POST', url: '/?a=1', payload: 'some text', headers: { 'content-type': 'text/plain' } }, function (res) {

            expect(res.statusCode).to.equal(415);
            done();
        });
    });

    it('fails on null input', function (done) {

        var server = new Hapi.Server();
        server.connection();
        server.route({
            method: 'POST',
            path: '/',
            handler: function (request, reply) {

                return reply('ok');
            },
            config: {
                validate: {
                    payload: {
                        a: Joi.string().required()
                    }
                }
            }
        });

        server.inject({ method: 'POST', url: '/', payload: 'null', headers: { 'content-type': 'application/json' } }, function (res) {

            expect(res.statusCode).to.equal(400);
            expect(res.result.validation.source).to.equal('payload');
            done();
        });
    });

    it('fails on no payload', function (done) {

        var server = new Hapi.Server();
        server.connection();
        server.route({
            method: 'POST',
            path: '/',
            handler: function (request, reply) {

                return reply('ok');
            },
            config: {
                validate: {
                    payload: {
                        a: Joi.string().required()
                    }
                }
            }
        });

        server.inject({ method: 'POST', url: '/' }, function (res) {

            expect(res.statusCode).to.equal(400);
            expect(res.result.validation).to.deep.equal({
                source: 'payload',
                keys: ['a']
            });

            done();
        });
    });

    it('samples responses', function (done) {

        var server = new Hapi.Server({ debug: false });
        server.connection();
        server.route({
            method: 'GET',
            path: '/',
            config: {
                handler: function (request, reply) {

                    return reply({ a: 1 });
                },
                response: {
                    sample: 50,
                    schema: {
                        b: Joi.string()
                    }
                }
            }
        });

        var count = 0;
        var action = function (next) {

            server.inject('/', function (res) {

                count += (res.statusCode === 500 ? 1 : 0);
                return next(null, res.statusCode);
            });
        };

        internals.times(500, action, function (err, codes) {

            expect(err).to.not.exist();
            expect(count).to.be.within(200, 300);
            done();
        });
    });

    it('validates response', function (done) {

        var i = 0;
        var handler = function (request, reply) {

            return reply({ some: i++ ? null : 'value' });
        };

        var server = new Hapi.Server({ debug: false });
        server.connection();
        server.route({
            method: 'GET',
            path: '/',
            config: {
                response: {
                    schema: {
                        some: Joi.string()
                    }
                }
            },
            handler: handler
        });

        server.inject('/', function (res1) {

            expect(res1.statusCode).to.equal(200);
            expect(res1.payload).to.equal('{"some":"value"}');

            server.inject('/', function (res2) {

                expect(res2.statusCode).to.equal(500);
                done();
            });
        });
    });

    it('validates response with context', function (done) {

        var i = 0;
        var handler = function (request, reply) {

            return reply({ some: 'thing', more: 'stuff' });
        };

        var server = new Hapi.Server({ debug: false });
        server.connection();
        server.route({
            method: 'GET',
            path: '/',
            config: {
                response: {
                    schema: Joi.object({
                        some: Joi.string(),
                        more: Joi.string()
                    }).when('$query.user', { is: 'admin', otherwise: Joi.object({ more: Joi.forbidden() }) })
                }
            },
            handler: handler
        });

        server.inject('/?user=admin', function (res1) {

            expect(res1.statusCode).to.equal(200);
            expect(res1.payload).to.equal('{"some":"thing","more":"stuff"}');

            server.inject('/?user=test', function (res2) {

                expect(res2.statusCode).to.equal(500);
                done();
            });
        });
    });

    it('validates error response', function (done) {

        var i = 0;
        var handler = function (request, reply) {

            var error = Boom.badRequest('Kaboom');
            error.output.payload.custom = i++;
            return reply(error);
        };

        var server = new Hapi.Server({ debug: false });
        server.connection();
        server.route({
            method: 'GET',
            path: '/',
            config: {
                response: {
                    status: {
                        400: {
                            statusCode: Joi.number(),
                            error: Joi.string(),
                            message: Joi.string(),
                            custom: 0
                        }
                    }
                }
            },
            handler: handler
        });

        server.inject('/', function (res1) {

            expect(res1.statusCode).to.equal(400);
            server.inject('/', function (res2) {

                expect(res2.statusCode).to.equal(500);
                done();
            });
        });
    });

    it('validates error response and ignore 200', function (done) {

        var i = 0;
        var handler = function (request, reply) {

            if (i === 0) {
                ++i;
                return reply({ a: 1, b: 2 });
            }

            var error = Boom.badRequest('Kaboom');
            error.output.payload.custom = i++;
            return reply(error);
        };

        var server = new Hapi.Server({ debug: false });
        server.connection();
        server.route({
            method: 'GET',
            path: '/',
            config: {
                response: {
                    schema: true,
                    status: {
                        400: {
                            statusCode: Joi.number(),
                            error: Joi.string(),
                            message: Joi.string(),
                            custom: 1
                        }
                    }
                }
            },
            handler: handler
        });

        server.inject('/', function (res1) {

            expect(res1.statusCode).to.equal(200);
            server.inject('/', function (res2) {

                expect(res2.statusCode).to.equal(400);
                server.inject('/', function (res3) {

                    expect(res3.statusCode).to.equal(500);
                    done();
                });
            });
        });
    });

    it('validates and modifies response', function (done) {

        var handler = function (request, reply) {

            return reply({ a: 1, b: 2 });
        };

        var server = new Hapi.Server({ debug: false });
        server.connection();
        server.route({
            method: 'GET',
            path: '/',
            config: {
                response: {
                    schema: Joi.object({
                        a: Joi.number()
                    }).options({ stripUnknown: true }),
                    modify: true
                }
            },
            handler: handler
        });

        server.inject('/', function (res) {

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.deep.equal({ a: 1 });
            done();
        });
    });

    it('validates and modifies error response', function (done) {

        var handler = function (request, reply) {

            var error = Boom.badRequest('Kaboom');
            error.output.payload.custom = '123';
            return reply(error);
        };

        var server = new Hapi.Server({ debug: false });
        server.connection();
        server.route({
            method: 'GET',
            path: '/',
            config: {
                response: {
                    status: {
                        400: {
                            statusCode: Joi.number(),
                            error: Joi.string(),
                            message: Joi.string(),
                            custom: Joi.number()
                        }
                    },
                    modify: true
                }
            },
            handler: handler
        });

        server.inject('/', function (res) {

            expect(res.statusCode).to.equal(400);
            expect(res.result.custom).to.equal(123);
            done();
        });
    });

    it('validates empty response', function (done) {

        var server = new Hapi.Server();
        server.connection();
        server.route({
            method: 'GET',
            path: '/',
            config: {
                response: {
                    status: {
                        204: false
                    }
                },
                handler: function (request, reply) {

                    reply().code(204);
                }
            }
        });

        server.inject('/', function (res) {

            expect(res.statusCode).to.equal(204);
            done();
        });
    });

    it('throws on sample with response modify', function (done) {

        var handler = function (request, reply) {

            return reply({ a: 1, b: 2 });
        };

        var server = new Hapi.Server({ debug: false });
        server.connection();
        expect(function () {

            server.route({
                method: 'GET',
                path: '/',
                config: {
                    response: {
                        schema: Joi.object({
                            a: Joi.number()
                        }).options({ stripUnknown: true }),
                        modify: true,
                        sample: 90
                    }
                },
                handler: handler
            });
        }).to.throw(/"modify" conflict with forbidden peer "sample"/);
        done();
    });

    it('validates response using custom validation function', function (done) {

        var i = 0;
        var handler = function (request, reply) {

            return reply({ some: i++ ? null : 'value' });
        };

        var server = new Hapi.Server({ debug: false });
        server.connection();
        server.route({
            method: 'GET',
            path: '/',
            config: {
                response: {
                    schema: function (value, options, next) {

                        return next(value.some === 'value' ? null : new Error('Bad response'));
                    }
                }
            },
            handler: handler
        });

        server.inject('/', function (res1) {

            expect(res1.statusCode).to.equal(200);
            expect(res1.payload).to.equal('{"some":"value"}');

            server.inject('/', function (res2) {

                expect(res2.statusCode).to.equal(500);
                done();
            });
        });
    });

    it('catches error thrown by custom validation function', function (done) {

        var i = 0;
        var handler = function (request, reply) {

            return reply({ some: i++ ? null : 'value' });
        };

        var server = new Hapi.Server({ debug: false });
        server.connection();
        server.route({
            method: 'GET',
            path: '/',
            config: {
                response: {
                    schema: function (value, options, next) {

                        throw new Error('Bad response');
                    }
                }
            },
            handler: handler
        });

        server.inject('/', function (res) {

            expect(res.statusCode).to.equal(500);
            done();
        });
    });

    it('skips response validation when sample is zero', function (done) {

        var server = new Hapi.Server({ debug: false });
        server.connection();
        server.route({
            method: 'GET',
            path: '/',
            config: {
                handler: function (request, reply) {

                    return reply({ a: 1 });
                },
                response: {
                    sample: 0,
                    schema: {
                        b: Joi.string()
                    }
                }
            }
        });

        var count = 0;
        var action = function (next) {

            server.inject('/', function (res) {

                count += (res.statusCode === 500 ? 1 : 0);
                return next(null, res.statusCode);
            });
        };

        internals.times(500, action, function (err, codes) {

            expect(err).to.not.exist();
            expect(count).to.equal(0);
            done();
        });
    });

    it('fails response validation with options', function (done) {

        var server = new Hapi.Server({ debug: false });
        server.connection({ routes: { response: { options: { convert: false } } } });
        server.route({
            method: 'GET',
            path: '/',
            config: {
                handler: function (request, reply) {

                    return reply({ a: '1' });
                },
                response: {
                    schema: {
                        a: Joi.number()
                    }
                }
            }
        });

        server.inject('/', function (res) {

            expect(res.statusCode).to.equal(500);
            done();
        });
    });

    it('skips response validation when schema is true', function (done) {

        var server = new Hapi.Server({ debug: false });
        server.connection();
        server.route({
            method: 'GET',
            path: '/',
            config: {
                handler: function (request, reply) {

                    return reply({ a: 1 });
                },
                response: {
                    schema: true
                }
            }
        });

        server.inject('/', function (res) {

            expect(res.statusCode).to.equal(200);
            done();
        });
    });

    it('skips response validation when status is empty', function (done) {

        var server = new Hapi.Server({ debug: false });
        server.connection();
        server.route({
            method: 'GET',
            path: '/',
            config: {
                handler: function (request, reply) {

                    return reply({ a: 1 });
                },
                response: {
                    status: {}
                }
            }
        });

        server.inject('/', function (res) {

            expect(res.statusCode).to.equal(200);
            done();
        });
    });

    it('forbids response when schema is false', function (done) {

        var server = new Hapi.Server({ debug: false });
        server.connection();
        server.route({
            method: 'GET',
            path: '/',
            config: {
                handler: function (request, reply) {

                    return reply({ a: 1 });
                },
                response: {
                    schema: false
                }
            }
        });

        server.inject('/', function (res) {

            expect(res.statusCode).to.equal(500);
            done();
        });
    });

    it('ignores error responses', function (done) {

        var server = new Hapi.Server();
        server.connection();
        server.route({
            method: 'GET',
            path: '/',
            config: {
                handler: function (request, reply) {

                    return reply(Boom.badRequest());
                },
                response: {
                    schema: {
                        b: Joi.string()
                    }
                }
            }
        });

        server.inject('/', function (res) {

            expect(res.statusCode).to.equal(400);
            done();
        });
    });

    it('errors on non-plain-object responses', function (done) {

        var server = new Hapi.Server({ debug: false });
        server.connection();
        server.route({
            method: 'GET',
            path: '/',
            config: {
                handler: function (request, reply) {

                    return reply.file('./package.json');
                },
                response: {
                    schema: {
                        b: Joi.string()
                    }
                }
            }
        });

        server.inject('/', function (res) {

            expect(res.statusCode).to.equal(500);
            done();
        });
    });

    it('logs invalid responses', function (done) {

        var server = new Hapi.Server({ debug: false });
        server.connection();
        server.route({
            method: 'GET',
            path: '/',
            config: {
                handler: function (request, reply) {

                    return reply({ a: 1 });
                },
                response: {
                    failAction: 'log',
                    schema: {
                        b: Joi.string()
                    }
                }
            }
        });

        server.on('request-internal', function (request, event, tags) {

            if (tags.validation) {
                expect(event.data).to.equal('"a" is not allowed');
            }
        });

        server.inject('/', function (res) {

            expect(res.statusCode).to.equal(200);
            done();
        });
    });

    it('validates valid header', function (done) {

        var server = new Hapi.Server();
        server.connection();
        server.route({
            method: 'GET',
            path: '/',
            handler: function (request, reply) {

                return reply('ok');
            },
            config: {
                validate: {
                    headers: {
                        accept: Joi.string().valid('application/json').required(),
                        'user-agent': Joi.string().optional()
                    }
                }
            }
        });

        var settings = {
            url: '/',
            method: 'GET',
            headers: {
                Accept: 'application/json'
            }
        };

        server.inject(settings, function (res) {

            expect(res.statusCode).to.equal(200);
            done();
        });
    });

    it('rejects invalid header', function (done) {

        var server = new Hapi.Server();
        server.connection();
        server.route({
            method: 'GET',
            path: '/',
            handler: function (request, reply) {

                return reply('ok');
            },
            config: {
                validate: {
                    headers: {
                        accept: Joi.string().valid('text/html').required(),
                        'user-agent': Joi.string().optional()
                    }
                }
            }
        });

        var settings = {
            url: '/',
            method: 'GET',
            headers: {
                Accept: 'application/json'
            }
        };

        server.inject(settings, function (res) {

            expect(res.statusCode).to.equal(400);
            done();
        });
    });
});


internals.times = function (count, method, callback) {

    var counter = 0;

    var results = [];
    var done = function (err, result) {

        if (callback) {
            results.push(result);
            if (err) {
                callback(err);
                callback = null;
            }
            else {
                counter += 1;
                if (counter === count) {
                    callback(null, results);
                }
            }
        }
    };

    for (var i = 0; i < count; ++i) {
        method(done);
    }
};
