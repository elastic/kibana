import {LanguageServerProxy} from './lsp'
import {serve} from 'javascript-typescript-langserver/lib/server';
import * as Hapi from 'hapi';

const server = new Hapi.Server();

server.connection({port: 3000});

const lspPort = 20001;

let proxy = new LanguageServerProxy(lspPort);

export function handler(req: Hapi.Request, reply: Hapi.IReply) {
    if (typeof(req.payload) == 'object' && req.payload != null) {// is it a json ?
        let method = req.params.method;
        if (method) {
            proxy.receiveRequest("textDocument/" + method, req.payload).then(
                result => reply.response(result),
                error => reply.response(error).code(500));
        } else {
            reply.response('missing `method` in request').code(400)
        }
    } else {
        reply.response('json body required').code(400)  // bad request
    }
}

server.route({
    path: "/lsp/textDocument/{method}",
    handler,
    method: 'POST',
    config: {   //
        payload: {
            allow: 'application/json'
        }
    }
});

//start language server
serve({
    clusterSize: 1,
    lspPort
});


proxy.initialize({}, [{
    uri: "file:///Users/draco/workspace/lambdalab/castro/kibana-extra/castro",
    name: "root"
}]).then(console.log);

proxy.listen();

server.start();