import * as Hapi from "hapi";
import {serve} from "javascript-typescript-langserver/lib/server";

import {ResponseMessage} from "vscode-jsonrpc/lib/messages";
import {LanguageServerProxy} from "../lsp/proxy";

const Path = require("path");

const lspPort = 20000;

export const proxy = new LanguageServerProxy(lspPort, "127.0.0.1", console);

export default async function (server: Hapi.Server) {

    const repodir = Path.join(__dirname, "../../");

    console.log("root dir is " + repodir);

    // start a embedded language server for js/ts
    serve({
        clusterSize: 1,
        lspPort
    });

    proxy.listen();
    await proxy.initialize({}, [{
        uri: `file://${repodir}`,
        name: "root"
    }]).then(result => console.log(result));
    server.route({
        path: "/api/lsp/textDocument/{method}",
        async handler(req: Hapi.Request, reply: Hapi.IReply) {

            if (typeof(req.payload) == 'object' && req.payload != null) {// is it a json ?
                let method = req.params.method;
                if (method) {
                    proxy.receiveRequest(`textDocument/${method}`, req.payload).then(
                        result => {
                            reply.response(result)
                        },
                        error => reply.response(error).code(500));
                } else {
                    reply.response('missing `method` in request').code(400)
                }
            } else {
                reply.response('json body required').code(400)  // bad request
            }
        },
        method: 'POST',
        config: {
            payload: {
                allow: 'application/json'
            }
        }
    })
}


// a lsp client used in server
export class LspProxyClient {
    private proxy: LanguageServerProxy;

    constructor(proxy: LanguageServerProxy) {
        this.proxy = proxy;
    }

    sendRequest(method: string, params: any): Promise<ResponseMessage> {
        return this.proxy.receiveRequest(method, params) as Promise<ResponseMessage>
    }
}