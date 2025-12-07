# Local Kibana Development with SSL

This setup runs Elasticsearch in Docker with SSL and Kibana locally from your IDE with SSL enabled.

## Setup Complete ✓

Your environment is now configured with:
- ✓ Elasticsearch 9.0.1 running in Docker with SSL on `https://localhost:9200`
- ✓ SSL certificates generated and placed in `./certs/`
- ✓ Kibana configured to run locally with SSL via `config/kibana.dev.yml`

## Starting Kibana

From the kibana repository root, run:

```bash
yarn start
```

Kibana will start on **https://localhost:5601**

## Login Credentials

- **URL**: https://localhost:5601
- **Username**: elastic
- **Password**: changeme

## Managing Elasticsearch

### Start Elasticsearch
```bash
docker compose up -d
```

### Stop Elasticsearch
```bash
docker compose stop
```

### Check Status
```bash
docker compose ps
```

### View Logs
```bash
docker logs ecp-elasticsearch
```

### Destroy (remove containers and volumes)
```bash
docker compose down -v
```

## Certificate Locations

- **CA Certificate**: `./certs/ca/ca.crt`
- **CA Key**: `./certs/ca/ca.key`
- **Kibana Certificate**: `./certs/kibana/kibana.crt`
- **Kibana Key**: `./certs/kibana/kibana.key`

## Trusting the CA Certificate (Optional)

To avoid browser warnings about self-signed certificates:

**macOS:**
```bash
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ./certs/ca/ca.crt
```

**Linux:**
```bash
sudo cp ./certs/ca/ca.crt /usr/local/share/ca-certificates/elastic-ca.crt
sudo update-ca-certificates
```

After adding the CA certificate, restart your browser.

## Troubleshooting

### Elasticsearch not responding
```bash
# Check if container is running
docker compose ps

# Check logs
docker logs ecp-elasticsearch --tail 50
```

### Certificate issues
The certificates are valid for:
- `localhost`
- `127.0.0.1`
- DNS name: `kibana`

If you need to regenerate certificates, just delete the `kibana_certs` volume:
```bash
docker compose down
docker volume rm kibana_certs
docker compose up -d
```

Then re-extract the certificates following the setup steps.

## Environment Variables

The `.env` file contains:
- `ELASTIC_PASSWORD`: Password for the `elastic` user
- `KIBANA_PASSWORD`: Password for the `kibana_system` user
- `STACK_VERSION`: Version of Elasticsearch/Kibana (currently 9.0.1)

## Files Created

- `.env` - Environment variables for docker-compose
- `docker-compose.yml` - Docker compose configuration
- `certs/` - SSL certificates directory
- `config/kibana.dev.yml` - Kibana configuration with SSL enabled

## Clean Up

To completely remove everything:
```bash
docker compose down -v
rm -rf certs/
rm .env
```

