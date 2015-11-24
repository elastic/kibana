let _ = require('lodash');
let Bcrypt = require('bcrypt');
let Hapi = require('hapi');
let Basic = require('hapi-auth-basic');

module.exports = (kbnServer, server, config) => {
	  
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
			
		    server.auth.strategy('simple', 'basic', { validateFunc: validate });
		    server.route({
		        method: 'GET',
		        path: '/login',
		        config: {
		            auth: 'simple',
		            handler: function (request, reply) {
		            	return reply.redirect('./app/kibana');
		            }
		        }
		    });
		    
		});
};