/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  isAndroidAgentName,
  isIosAgentName,
  isJavaAgentName,
  isRumAgentName,
  OpenTelemetryAgentName,
  OPEN_TELEMETRY_AGENT_NAMES,
} from '@kbn/elastic-agent-utils';
import defaultIcon from '../../../assets/default.svg';
import cppIcon from '../../../assets/cpp.svg';
import darkCppIcon from '../../../assets/cpp_dark.svg';
import dotNetIcon from '../../../assets/dot_net.svg';
import erlangIcon from '../../../assets/erlang.svg';
import darkErlangIcon from '../../../assets/erlang_dark.svg';
import goIcon from '../../../assets/go.svg';
import iosIcon from '../../../assets/ios.svg';
import darkIosIcon from '../../../assets/ios_dark.svg';
import javaIcon from '../../../assets/java.svg';
import nodeJsIcon from '../../../assets/nodejs.svg';
import ocamlIcon from '../../../assets/ocaml.svg';
import openTelemetryIcon from '../../../assets/otel_default.svg';
import phpIcon from '../../../assets/php.svg';
import pythonIcon from '../../../assets/python.svg';
import rubyIcon from '../../../assets/ruby.svg';
import rumJsIcon from '../../../assets/rumjs.svg';
import darkPhpIcon from '../../../assets/php_dark.svg';
import darkRumJsIcon from '../../../assets/rumjs_dark.svg';
import rustIcon from '../../../assets/rust.svg';
import darkRustIcon from '../../../assets/rust_dark.svg';
import androidIcon from '../../../assets/android.svg';

const agentIcons: { [key: string]: string } = {
  cpp: cppIcon,
  dotnet: dotNetIcon,
  erlang: erlangIcon,
  go: goIcon,
  ios: iosIcon,
  java: javaIcon,
  nodejs: nodeJsIcon,
  ocaml: ocamlIcon,
  opentelemetry: openTelemetryIcon,
  php: phpIcon,
  python: pythonIcon,
  ruby: rubyIcon,
  rum: rumJsIcon,
  rust: rustIcon,
  android: androidIcon,
};

const darkAgentIcons: { [key: string]: string } = {
  ...agentIcons,
  cpp: darkCppIcon,
  erlang: darkErlangIcon,
  ios: darkIosIcon,
  php: darkPhpIcon,
  rum: darkRumJsIcon,
  rust: darkRustIcon,
};

const getAgentNameWithoutPrefix = (agentName: string) => {
  if (agentName.startsWith('opentelemetry/')) {
    // for OpenTelemetry only split the agent name by `/` and take the second part, format is `opentelemetry/{agentName}/{details}`
    return agentName.split('/')[1];
  }
  return agentName;
};

// This only needs to be exported for testing purposes, since we stub the SVG
// import values in test.
export function getAgentIconKey(agentName: string) {
  // Ignore case
  const lowercasedAgentName = agentName.toLowerCase();

  // RUM agent names
  if (isRumAgentName(lowercasedAgentName)) {
    return 'rum';
  }

  // Java  agent names
  if (isJavaAgentName(lowercasedAgentName)) {
    return 'java';
  }

  if (isIosAgentName(lowercasedAgentName)) {
    return 'ios';
  }

  if (isAndroidAgentName(lowercasedAgentName)) {
    return 'android';
  }

  const agentNameWithoutPrefix = getAgentNameWithoutPrefix(lowercasedAgentName);

  if (Object.keys(agentIcons).includes(agentNameWithoutPrefix)) {
    return agentNameWithoutPrefix;
  }

  // OpenTelemetry-only agents
  if (OPEN_TELEMETRY_AGENT_NAMES.includes(lowercasedAgentName as OpenTelemetryAgentName)) {
    return 'opentelemetry';
  }
}

export function getAgentIcon(agentName: string | undefined, isDarkMode: boolean = false) {
  const key = agentName && getAgentIconKey(agentName);
  if (!key) {
    return defaultIcon;
  }
  return (isDarkMode ? darkAgentIcons[key] : agentIcons[key]) ?? defaultIcon;
}
