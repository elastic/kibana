NODE_VERSION    = $(shell cat .node-version)

KIBANA_VERSION ?= 8.1.x
NETWORK        ?= apm-integration-testing
PORT           ?= 5601

DOCKER_IMAGE    = kibana-dev:${KIBANA_VERSION}
DOCKER_RUN_ARGS = --rm -p ${PORT}:5601 -p 9229-9231:9229-9231/tcp -v $(shell pwd):/kibana/src -it ${DOCKER_IMAGE}

.PHONY: build run run-networkless

build:
	docker build --build-arg NODE_VERSION="${NODE_VERSION}" -t ${DOCKER_IMAGE} .

run:
	docker run --network ${NETWORK} ${DOCKER_RUN_ARGS}

run-networkless:
	docker run ${DOCKER_RUN_ARGS}
