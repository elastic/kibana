#!/usr/bin/env bash

set -euo pipefail

echo '--- Auth and set up kubectl'

gcloud container clusters get-credentials demo-env --region us-central1 --project elastic-kibana-184716
kubectl config use-context gke_elastic-kibana-184716_us-central1_demo-env
