// @ts-ignore
import git from "@cypress/commit-info";
import { getCommitDefaults } from "./ciProvider";

export const getGitInfo = async (projectRoot: string) => {
  const commitInfo = await git.commitInfo(projectRoot);
  return getCommitDefaults({
    branch: commitInfo.branch,
    remoteOrigin: commitInfo.remote,
    authorEmail: commitInfo.email,
    authorName: commitInfo.author,
    message: commitInfo.message,
    sha: commitInfo.sha,
  });
};
