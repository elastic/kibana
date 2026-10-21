#!/bin/bash
# Research measurement image only. Copied into the serverless image build.
# Does not set NODE_OPTIONS. The controller still sets --max-old-space-size.
export KBN_RESEARCH_T7A=true
export KBN_RESEARCH_CAPABILITY_KIT=true
export T7P_PROCESS_OLD_SPACE_MB=384
