import * as Hapi from "hapi";

import Path from 'path';

export default function (server: Hapi.Server) {
    server.route({
        method: 'GET',
        path: '/monaco/{param*}',
        handler: {
            directory: {
                path: Path.join(__dirname, "../../node_modules/monaco-editor/min")
            }
        }
    });
}