import {TreeEntry} from "nodegit";
import * as Hapi from 'hapi';
import {Commit, Entry} from '../../../../model/build/swagger-code-tsClient/api';

import {computeRanges, mergeSymbols, render, tokenizeLines} from '../highlights';
import {LspProxyClient, TextDocumentMethods} from "../lsp/LspClient";

import {proxy} from './lsp'

const Git = require("nodegit");
const Path = require("path");

const repodir = Path.join(__dirname, "../../../../");

const lspClient = new LspProxyClient(proxy);
const documentMethods = new TextDocumentMethods(lspClient);


async function getHeadCommit(): Promise<Commit> {

    const repo = await Git.Repository.open(repodir);
    const commit = await repo.getHeadCommit();

    const result: Commit = {
        commit: commit.id().tostrS(),
        committer: commit.committer().toString(),
        message: commit.message(),
        date: commit.date().toLocaleDateString(),
        entries: []
    };
    const tree = await commit.getTree();
    const walker = tree.walk(true);
    walker.on("entry", async (entry: TreeEntry) => {
        const blob = await entry.getBlob();
        const isBinary = blob.isBinary() === 1;
        let e: Entry = {
            path: entry.path(),
            isBinary: isBinary,
            blob: isBinary ? "binary" : blob.toString()
        };
        if (!isBinary) {
            const lines = tokenizeLines(e.path, e.blob);
            computeRanges(lines);
            const result = render(lines);
            e.html = result;
            if (e.path.startsWith("kibana-extra/castro") && (e.path.endsWith(".ts") ||e.path.endsWith(".tsx") || e.path.endsWith(".js"))) {
                try {
                    const symbols = await documentMethods.documentSymbol.send({
                        textDocument: {
                            uri: `file://${repodir}/${e.path}`
                        }
                    });
                    mergeSymbols(lines, symbols)
                } catch (e) {
                    console.error(e)

                }
            }
        }
        result.entries.push(e)
    });
    walker.start();
    return await (new Promise<Commit>(function (resolve, reject) {
        walker.on("end", () => {
            resolve(result)
        })
    }));
}

export default function (server: Hapi.Server) {
    server.route({
        path: '/api/castro/example',
        method: 'GET',
        handler(req: Hapi.Request, reply: any) {
            getHeadCommit().then((result: Commit) => reply(result))
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
