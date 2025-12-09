#! /bin/bash

# This is how we run it
docker compose -f k6-performance-test.docker-compose.yml up

# Or if we just want dockerised kibana on http://localhost:5601
# docker compose -f k6-performance-test.docker-compose.yml run kibana
