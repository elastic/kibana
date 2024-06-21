#!/bin/bash

ENV_PATH=".devcontainer/.env"

if [ -f "$ENV_PATH" ]; then
  source "$ENV_PATH"

  if [ -n "$SHELL" ] && [ -x "$SHELL" ]; then
    echo "Switching to preferred shell: $SHELL"
    sudo chsh -s "$SHELL" vscode
  else
    echo "Preferred shell is not set or not executable. Continuing with the current shell."
  fi
else
  echo ".env file not found."
fi
