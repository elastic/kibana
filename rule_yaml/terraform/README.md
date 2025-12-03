# Terraform for Kibana Alerting Rules

This project provides a generic and scalable example of how to manage Kibana alerting rules as code using Terraform and the Elastic Stack provider.

Rule definitions are separated from the Terraform logic, allowing you to manage your rules as simple YAML data.

## Prerequisites

1.  **Terraform:** You must have Terraform installed.
2.  **Running Elastic Stack:** You need a running Kibana instance that you can connect to.

## Configuration

1.  **Define Your Rules:**
    Open the `rules.yml` file. This file contains an array of rule objects. You can add, remove, or modify the rules in this file. The `name` of each rule must be unique.

2.  **Set Authentication:**
    The provider is configured to use an API key for authentication. The best way to provide this is via an environment variable.

    Create an API key in Kibana with permissions to manage Alerting and Actions. Then, export it as an environment variable:

    ```sh
    export ELASTICSTACK_KIBANA_APIKEY="YOUR_API_KEY_HERE"
    ```

3.  **Set Endpoint (Optional):**
    The Kibana endpoint defaults to `http://localhost:5601`. If your Kibana is running elsewhere, you can change the default in `variables.tf`.

## Usage

1.  **Initialize Terraform:**
    Navigate to this directory and run the `init` command. This will download the necessary Elastic Stack provider.

    ```sh
    terraform init
    ```

2.  **Plan Changes:**
    Run the `plan` command to see what changes Terraform will make. It will read the `rules.yml` file and show a plan to create, update, or delete rules in Kibana to match the state of the file.

    ```sh
    terraform plan
    ```

3.  **Apply Changes:**
    Run the `apply` command to execute the plan.

    ```sh
    terraform apply
    ```

By managing your rules in the `rules.tfvars.json` file, you can now easily version control your alerting logic and apply it to any Kibana instance.