import { EuiIcon, EuiIconProps } from '@elastic/eui';
import React from 'react';
import { ElasticAgentName } from '../../typings';
import androidIcon from './icons/android.svg';
import dotNetIcon from './icons/dot_net.svg';
import goIcon from './icons/go.svg';
import iosIcon from './icons/ios.svg';
import javaIcon from './icons/java.svg';
import nodeJsIcon from './icons/nodejs.svg';
import phpIcon from './icons/php.svg';
import pythonIcon from './icons/python.svg';
import rubyIcon from './icons/ruby.svg';
import rumJsIcon from './icons/rumjs.svg';

const agentIcons: Record<ElasticAgentName, string> = {
  'android/java': androidIcon,
  java: javaIcon,
  'iOS/swift': iosIcon,
  'js-base': nodeJsIcon,
  'rum-js': rumJsIcon,
  dotnet: dotNetIcon,
  go: goIcon,
  nodejs: nodeJsIcon,
  php: phpIcon,
  python: pythonIcon,
  ruby: rubyIcon,
};

interface Props {
  agentName: ElasticAgentName;
  size?: EuiIconProps['size'];
}

export function AgentIcon({ agentName, size }: Props) {
  const icon = agentIcons[agentName];
  return <EuiIcon type={icon} size={size} title={agentName} />;
}
