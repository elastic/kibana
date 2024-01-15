# Interactive Setup Plugin

This plugin provides UI and APIs for interactive setup mode a.k.a "enrollment flow".

## How to run interactive setup locally

Kibana does not start interactive setup mode if it detects that an Elasticsearch connection has already been configured. This is always the case when running `yarn start` so in order to trigger interactive setup we need to run Elasticsearch manually and pass a special command line flag to the Kibana start command.

1. Start a clean copy of Elasticsearch from inside your Kibana working directory:

    ```
    cd <kibana-repo>/.es/cache
    tar -xzf elasticsearch-8.10.0-SNAPSHOT-darwin-aarch64.tar.gz
    cd ./elasticsearch-8.10.0-SNAPSHOT
    ./bin/elasticsearch
    ```

    You should see the enrollment token get logged:

    ```
    Elasticsearch security features have been automatically configured!

    • Copy the following enrollment token and paste it into Kibana in your browser:
    eyJ2ZXIiOiI4LjEwLjAiLCJhZHIiOlsiMTkyLjE2OC4xLjIxMTo5MjAwIl0sImZnciI6ImZiYWZjOTgxODM0MjAwNzQ0M2ZhMzNmNTQ2N2QzMTM0YTk1NzU2NjEwOTcxNmJmMjdlYWViZWNlYTE3NmM3MTkiLCJrZXkiOiJxdVVQallrQkhOTkFxOVBqNEY0ejpZUkVMaFR5ZlNlZTZGZW9PQVZwaDRnIn0=
    ```

2. Start Kibana without dev credentials and config:

    ```
    yarn start --no-dev-credentials --no-dev-config
    ```

    You should see the magic link get logged:

    ```
    i Kibana has not been configured.

    Go to http://localhost:5601/tcu/?code=651822 to get started.
    ```

3. Open the link and copy the enrollment token from Elasticsearch when prompted to complete setup.

Note: If you want to go through the enrollment flow again you will need to clear all Elasticsearch settings (`elasticsearch.*`) from your `kibana.yml` file and trash your Elasticsearch folder before starting with Step 1. 
