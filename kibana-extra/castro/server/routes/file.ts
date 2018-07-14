import * as Hapi from 'hapi';
import * as Path from 'path';
import {FileTree, FileTreeItemType, RepositoryUri} from '../../model/repository'
import {Commit, Error, Repository, Tree, TreeEntry} from "nodegit";
import Boom from 'boom';

/**
 * do a nodegit operation and check the results. If it throws a not found error or returns null,
 * rethrow a Boom.notFound error.
 * @param func the nodegit operation
 * @param message the message pass to Boom.notFound error
 */
async function checkExists<R>(func: () => Promise<R>, message: string): Promise<R> {
    let result: R;
    try {
        result = await func();
    } catch (e) {
        if (e.errno == Error.CODE.ENOTFOUND) {
            throw Boom.notFound(message)
        } else {
            throw e;
        }
    }
    if (result == null) {
        throw Boom.notFound(message);
    }
    return result;
}

function entry2Tree(entry: TreeEntry): FileTree {
    return {
        name: entry.name(),
        path: entry.path(),
        sha1: entry.sha(),
        type: entry.isDirectory() ? FileTreeItemType.Directory :
            entry.isSubmodule() ? FileTreeItemType.Submodule : FileTreeItemType.File
    };
}

class FileResolver {
    private repoRoot: string;

    constructor(repoRoot: string) {
        this.repoRoot = repoRoot;
    }

    async getCommit(repo: Repository, revision: string): Promise<Commit> {
        if (revision.toUpperCase() === "HEAD") {
            return await repo.getHeadCommit();
        }
        try {
            return await repo.getBranchCommit(revision);
        } catch (e) {
            if (e.errno == Error.CODE.ENOTFOUND) {
                return checkExists(() => repo.getCommit(revision),
                    `revision or branch ${revision} not found in ${repo.path()}`
                );
            } else {
                throw e;
            }
        }

    }

    async openRepo(uri: RepositoryUri): Promise<Repository> {
        const repoDir = Path.join(this.repoRoot, uri);
        return checkExists<Repository>(() => Repository.open(repoDir),
            `repo ${uri} not found`);
    }

    async fileTree(uri: RepositoryUri,
                   path: string,
                   revision: string = "HEAD",
                   depth: number = Number.MAX_SAFE_INTEGER): Promise<FileTree> {

        async function walkTree(file: FileTree, tree: Tree, depth: number): Promise<FileTree> {
            if (depth > 0) {
                file.children = [];
                for (const entry of tree.entries()) {
                    const subDir = entry2Tree(entry);
                    if (entry.isDirectory()) {
                        await walkTree(subDir, await entry.getTree(), depth - 1)
                    }
                    file.children.push(subDir);
                }
            }
            return file;
        }

        const repo = await this.openRepo(uri);
        const commit = await this.getCommit(repo, revision);
        const tree = await commit.getTree();

        if (path) {
            const entry = await checkExists(() => Promise.resolve(tree.getEntry(path)),
                `path ${path} does not exists.`);
            if (!entry) {
                return null;
            } else if (entry.isDirectory()) {
                return await walkTree(entry2Tree(entry), await entry.getTree(), depth)
            } else {
                return entry2Tree(entry);
            }
        } else {
            return await walkTree({
                name: "",
                path: "",
                type: FileTreeItemType.Directory
            }, tree, depth);
        }

    }

    async fileContent(uri: RepositoryUri,
                      path: string,
                      revision: string = "HEAD") {
        const repo = await this.openRepo(uri);
        const commit = await this.getCommit(repo, revision);
        let entry: TreeEntry = await checkExists(() => commit.getEntry(path),
            `file ${uri}/${path} not found `);
        if (entry.isFile()) {
            return await entry.getBlob()
        } else {
            throw Boom.unsupportedMediaType(`${uri}/${path} is not a file.`)
        }
    }

}

export default function (server: Hapi.Server) {
    const homedir = require('os').homedir();

    server.route({
        path: '/api/castro/repo/{site}/{org}/{repo}/tree/{rev}/{path*}',
        method: 'GET',
        async handler(req: Hapi.Request, reply: any) {
            const config = req.server.config();
            const dataPath: string = Path.join(homedir, config.get('castro.dataPath'));
            const fileResolver = new FileResolver(dataPath);
            const {site, org, repo, path, rev} = req.params;
            const uri = `${site}/${org}/${repo}`;
            const depth = req.query.depth || Number.MAX_SAFE_INTEGER;
            try {
                reply(await fileResolver.fileTree(uri, path, rev, depth));
            } catch (e) {
                if (e.isBoom) {
                    reply(e)
                } else {
                    reply(Boom.internal(e.message || e.name))
                }
            }
        }
    });
    server.route({
        path: '/api/castro/repo/{site}/{org}/{repo}/blob/{rev}/{path*}',
        method: 'GET',
        async handler(req: Hapi.Request, reply: Hapi.IReply) {
            const config = req.server.config();
            const dataPath: string = Path.join(homedir, config.get('castro.dataPath'));
            const fileResolver = new FileResolver(dataPath);

            const {site, org, repo, path, rev} = req.params;
            const uri = `${site}/${org}/${repo}`;
            try {
                const blob = await fileResolver.fileContent(uri, path, rev);
                if (blob.isBinary()) {
                    reply(blob.content()).type("application/octet-stream")
                } else {
                    reply(blob.content()).type("text/plain")
                }
            } catch (e) {
                if (e.isBoom) {
                    reply(e)
                } else {
                    reply(Boom.internal(e.message || e.name))
                }
            }
        }
    });
}