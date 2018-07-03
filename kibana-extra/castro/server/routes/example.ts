import * as Hapi from 'hapi';
import {Entry} from '../../../../model/build/swagger-code-tsClient/api';

import {computeRanges, render, tokenizeLines} from '../highlights';

const Path = require("path");
const fs = require('fs');

const repodir = Path.join(__dirname, "../../");

async function getTree() {
    const root = {name: 'root', path: repodir, children: []};
    const dirs = {[repodir]: root};

    try {
        const walk = function (dir: string, callback: (parentDir: string, file: string, isFile: boolean) => void) {
            let list = fs.readdirSync(dir);
            list.forEach(function (file) {
                let path = Path.join(dir, file);
                const stat = fs.statSync(path);

                if (stat && stat.isDirectory()) {
                    /* Recurse into a subdirectory */
                    callback(dir, path, false);
                    walk(path, callback);
                } else {
                    /* Is a file */
                    callback(dir, path, true)
                }
            });
        };
        walk(repodir, (parentDir, path, isFile) => {

            const parent = dirs[parentDir];
            if (parent) {
                if (isFile) {
                    if ((path.endsWith(".ts") || path.endsWith(".js") || path.endsWith(".tsx"))) {
                        const blob = fs.readFileSync(path, "utf8");
                        const lines = tokenizeLines(path, blob);
                        computeRanges(lines);
                        let e = {
                            path: Path.relative(repodir, path),
                            isBinary: false,
                            blob,
                            html: render(lines),
                            name: Path.basename(path)
                        };
                        parent.children.push(e);
                    }
                } else {
                    const dirname = Path.basename(path);
                    if (!(dirname === "node_modules" || dirname[0] === "." || dirname === "build")) {
                        const newDir = {
                            path: Path.relative(repodir, path),
                            name: dirname,
                            children: []
                        };
                        parent.children.push(newDir);
                        dirs[path] = newDir;
                    }
                }
            }
        });
    } catch (e) {
        console.log(e)
    }
    return {
        workspace: repodir,
        root
    };
}

async function getFiles() {
    const files = [];
    try {
        const walk = function (dir: string, callback: (file: string) => void) {
            let list = fs.readdirSync(dir);
            list.forEach(function (file) {
                let path = Path.join(dir, file);
                const stat = fs.statSync(path);
                if (stat && stat.isDirectory()) {
                    /* Recurse into a subdirectory */
                    walk(path, callback);
                } else {
                    /* Is a file */
                    callback(path)
                }
            });
        };
        walk(repodir, path => {
            if (!path.includes("node_modules") && (path.endsWith(".ts") || path.endsWith(".js") || path.endsWith(".tsx"))) {
                console.log(path);
                const blob = fs.readFileSync(path, "utf8");
                const lines = tokenizeLines(path, blob);
                computeRanges(lines);
                let e: Entry = {
                    path: Path.relative(repodir, path),
                    isBinary: false,
                    blob,
                    html: render(lines)
                };
                files.push(e);
            }
        });
    } catch (e) {
        console.log(e)
    }
    return {
        workspace: repodir,
        entries: files
    };
}

export default function (server: Hapi.Server) {
    server.route({
        path: '/api/castro/example',
        method: 'GET',
        handler(req: Hapi.Request, reply: any) {
            getFiles().then((result) => reply(result), err => reply(err).code(500))
        }
    });
    server.route({
        path: '/api/castro/tree',
        method: 'GET',
        handler(req: Hapi.Request, reply: any) {
            getTree().then((result) => reply(result), err => reply(err).code(500))
        }
    });
    server.route({
        path: '/api/castro/highlight/{path}',
        method: 'POST',
        handler(req: Hapi.Request, reply: any) {
            const {content} = req.payload;
            const path = req.params.path;
            const lines = tokenizeLines(path, content);
            computeRanges(lines);
            const result = render(lines);
            reply(result)
        }
    });
}
