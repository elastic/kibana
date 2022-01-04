# Example usage:
# With .backport/config.json mounted:
    # - `backport`
# Without .backport/config.json mounted:
    # `backport --accessToken myGithubAccessToken --repo-owner backport-org --repo-name backport-demo`
backport() {
    BACKPORT_FOLDER=~/.backport
    GITCONFIG=~/.gitconfig

    # -it: interactive shell
    # --rm: remove container after exit
    # -v: Mounts the following volumes:
        # - current directory as read-only volume (to access .backportrc.json)
        # - .backport folder (to access config.json and avoid re-cloning repos)
        # - gitconfig (to apply correct username and email to cherry-picked commits)
    # "$@": pass all bash arguments to docker (which into turn passes them to backport cli inside container)
    docker run -it --rm -v $(pwd):/app:ro -v $BACKPORT_FOLDER:/root/.backport -v $GITCONFIG:/etc/gitconfig sqren/backport "$@"
}
