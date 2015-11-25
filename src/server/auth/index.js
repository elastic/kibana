let _ = require('lodash');
let Boom = require('boom');
let Joi = require('joi');
let hapiAuthCookie = require('hapi-auth-cookie');
let strategyMap = require('./lib/authStrategyMap');

/*
let Hapi = require('hapi');
let Bcrypt = require('bcrypt');
let Basic = require('hapi-auth-basic');
*/

module.exports = (kbnServer, server, config) => {
	
	var authorization=null;
	
	const scheme = function (server, options) {

	    return {
	        authenticate: function (request, reply) {
	        	
	            const req = request.raw.req;
	            // const authorization = req.headers.authorization;
	            // console.log("authorization");
	            // console.log(authorization);
	            //console.log(req.headers.cookie.data);
	            
	            
	            //let session = request.state.session;
	            console.log(req.states);
	            if (!authorization) {
	            	return reply.redirect('/login');
	                // return reply(Boom.unauthorized(null, 'Custom'));
	            }
	            return reply.continue({ credentials: { user: 'john' } });
	        }
	    };
	};
	server.auth.scheme('custom', scheme);
	server.state('data', {
	    ttl: null,
	    isSecure: true,
	    isHttpOnly: true,
	    encoding: 'base64json',
	    clearInvalid: false, // remove invalid cookies
	    strictHeader: true // don't allow violations of RFC 6265
	});
	
	server.state('session', {
	    ttl: 24 * 60 * 60 * 1000,     // One day
	    isSecure: true,
	    path: '/',
	    encoding: 'base64json'
	});
	
    let name = config.get('auth.strategy');
    let strategy = strategyMap.get(name);
    if (strategy == null) throw new Error(`There is no registered authentication strategy with the name "${name}".`);
    if (_.isFunction(strategy.init)) strategy.init(server);
	
	server.register(hapiAuthCookie, function (err) {  
		    if (err) {
		        throw err;
		    }		    
		    
		    let options = {
		    		cookie: 'sid',
			        password: config.get('auth.encryptionKey'),
			        ttl: config.get('auth.sessionTimeout'),
			        clearInvalid: true,
			        isHttpOnly: false,
			        keepAlive: true,
			        isSecure: true
		    };

		   if (_.isFunction(strategy.validate)) {
			   options.validateFunc = (request, session, callback) => strategy.validate(request, session).nodeify(callback);
		   }
		   server.auth.strategy('session', 'custom', 'required', options);
		 
		});

    
	server.route({
	    method: 'POST',
	    path: '/login',
	    handler(request, reply) {
	      strategy.authenticate(request, request.payload.username, request.payload.password)
	      .then((credentials) => {
	    	// request.auth.session.set(credentials);
	        // console.log("login success:");
	        // console.log(credentials);
	    	  //reply('Hello').state('data', { firstVisit: false });
	        authorization=credentials;
	        //server.log(['error', 'database', 'read']);
	        
	        let session = request.state.session;
	        if (!session) {
	            session = { user: 'joe' };
	        }
	        session.last = Date.now();

	        // console.log(request.session);
	        return reply('Success').state('session', session).redirect("./app/kibana");
	        // return reply('cookie').state('data', { firstVisit: false }).redirect("./app/kibana");
	       
	      }, (error) => {
	        // request.auth.session.clear();
	        reply(Boom.unauthorized(error));
	      });
	    },
	    config: {
	      auth: false,
	      validate: {
	        payload: {
	          username: Joi.string().required(),
	          password: Joi.string().required()
	        }
	      }
	    }
	  });
	
	server.route({
	    method: 'GET',
	    path: '/logout',
	    handler(request, reply) {
	      request.auth.session.clear();
	      return reply.redirect('/');
	    }
	  });
	
	/*
        var users = {
		    john: {
		        username: 'john',
		        password: '$2a$10$iqJSHD.BGr0E2IxQwYgJmeP3NvhPrXAeLSaGCj6IR/XU5QtjVu5Tm',   // 'secret'
		        name: 'John Doe',
		        id: '2133d32a'
		    }
		};

		var validate = function (request, username, password, callback) {
		    var user = users[username];
		    if (!user) {
		        return callback(null, false);
		    }

		    Bcrypt.compare(password, user.password, function (err, isValid) {
		        callback(err, isValid, { id: user.id, name: user.name });
		    });
		};
		
		server.register(Basic, function (err) {
			 let options = {
				      cookie: 'sid',
				      clearInvalid: true,
				      isHttpOnly: false,
				      keepAlive: true,
				      isSecure: true,
				      redirectTo: '/login',
				      validateFunc: validate
				    };
			
		    server.auth.strategy('simple', 'basic', options);
		});
		
        server.route({
        	    method: 'POST',
		        path: '/login',
		        config: {
		            auth: 'simple',
		            handler: function (request, reply) {
		            	console.log(request.payload)
		            	return reply.redirect('./app/kibana');
		            }
		        }
		    });
		    
        server.route({
            method: 'GET',
            path: '/logout',
            handler(request, reply) {
            	try{
                request.auth.session.clear();
            	}catch (e){ 
            		
            	}
                return reply.redirect('/login');
            }
        });
        */
        
        
		
	  
	/*
 if (!config.get('auth.enabled')) return;
  let name = config.get('auth.strategy');
  let strategy = strategyMap.get(name);
  // console.log(strategy);
  if (strategy == null) throw new Error(`There is no registered authentication strategy with the name "${name}".`);
  if (_.isFunction(strategy.init)) strategy.init(server);

  server.register(hapiAuthCookie, (error) => {
    if (error != null) throw error;

    // console.log(hapiAuthCookie);
    let options = {
      cookie: 'sid',
      password: config.get('auth.encryptionKey'),
      ttl: config.get('auth.sessionTimeout'),
      clearInvalid: true,
      isHttpOnly: false,
      keepAlive: true,
      isSecure: true,
      redirectTo: '/login'
    };

    if (_.isFunction(strategy.validate)) {
      options.validateFunc = (request, session, callback) => strategy.validate(request, session).nodeify(callback);
    }
    server.auth.strategy('session', 'cookie', 'required', options);
  });
  
  server.route({
    method: 'POST',
    path: '/login',
    handler(request, reply) {
      strategy.authenticate(request, request.payload.username, request.payload.password)
      .then((credentials) => {
        request.auth.session.set(credentials);

        // add by darcy
        request.auth.credentials=credentials;
        request.auth.isAuthenticated=true;
        // console.log("login success:");
        // console.log(credentials);
        console.log(request.auth);
        return reply.redirect("./app/kibana");
        // reply.file('../../plugins/login/login.html');
       
      }, (error) => {
        request.auth.session.clear();
        reply(Boom.unauthorized(error));
      });
    },
    config: {
      auth: false,
      validate: {
        payload: {
          username: Joi.string().required(),
          password: Joi.string().required()
        }
      }
    }
  });
  

  server.route({
    method: 'GET',
    path: '/logout',
    handler(request, reply) {
      request.auth.session.clear();
      return reply.redirect('/');
    }
  });*/
};

