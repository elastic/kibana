const Git = require("nodegit");
const Path = require("path");

export default function (server) {

  server.route({
    path: '/api/castro/example',
    method: 'GET',
    handler(req, reply) {
      const repodir = Path.join(__dirname, "../../../../");
      console.log("repodir is " + repodir)
      const result = {}
      Git.Repository.open(repodir).then(function (repo) {
        return repo.getMasterCommit();
      }).then(function(commit){
        console.log("commit is "+ commit)
        result["commit"] = commit.id().tostrS();
        result["committer"] = commit.committer().toString();
        result["message"] = commit.message();
        result["date"] = commit.date().toLocaleDateString();
        return commit.getTree();
      }).then(function (tree) {
        result["entries"] = [];
        var walker = tree.walk();
        walker.on("entry", function(entry) {
          entry.getBlob().then(function(blob){
            const isBinary = blob.isBinary === 1
            result.entries.push({ path: entry.path(), 
              blob: isBinary ? "binary" : blob.toString(), 
              isBinary: isBinary 
            });
          })
        });
        walker.on("end", function(){
          reply(result)
        })
        walker.start();
        
      });
    }
  })

}
