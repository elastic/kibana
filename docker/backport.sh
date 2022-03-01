# Example usage:
# ./backport.sh --repo backport-org/backport-demo
# -it: interactive shell
# --rm: remove container after exit
# --name: container na,e
# -v: Mounts the following volumes:
    # - current directory as read-only volume (to access .backportrc.json)
    # - .backport folder (to access config.json and avoid re-cloning repos)
# "$@": pass all bash arguments to docker (which into turn passes them to backport cli inside container)

cd $(dirname $0)
docker run -it --rm --name backport -v $(pwd):/app:ro -v ~/.backport:/root/.backport $(docker build -q .) "$@"

