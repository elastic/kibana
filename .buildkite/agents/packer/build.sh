#!/bin/bash

packer build -var-file=vars.pkrvars.hcl .
