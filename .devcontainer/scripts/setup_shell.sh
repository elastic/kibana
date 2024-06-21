#!/bin/bash

ENV_PATH=".devcontainer/.env"

if [ -f "$ENV_PATH" ]; then
  source "$ENV_PATH"

  if [ -n "$SHELL" ] && [ -x "$SHELL" ]; then
    echo "Switching to shell: $SHELL"
    sudo chsh -s "$SHELL" vscode
  else
    echo "Shell is not set or not executable, using bash."
  fi
else
  echo ".env file not found."
fi
