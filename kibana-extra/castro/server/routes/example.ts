import {TreeEntry} from "nodegit";
import * as Hapi from 'hapi';
import {Commit} from '../../common/proto'

const Git = require("nodegit");
const Path = require("path");


async function getHeadCommit(): Promise<Commit> {
    const repodir = Path.join(__dirname, "../../../../");

    const repo = await Git.Repository.open(repodir);
    const commit = await repo.getMasterCommit();

    const result = Commit.create({
        commit: commit.id().tostrS(),
        committer: commit.committer().toString(),
        message: commit.message(),
        date: commit.date().toLocaleDateString()
    });
    const tree = await commit.getTree();
    const walker = tree.walk(true);
    walker.on("entry", async (entry: TreeEntry) => {
        const blob = await entry.getBlob();
        result.entries.push({
            path: entry.path(),
            isBinary: blob.isBinary() === 1,
            blob: blob.isBinary() === 1 ? "binary" : blob.toString()
        })
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
}
