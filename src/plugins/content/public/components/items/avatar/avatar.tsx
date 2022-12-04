import React from 'react';
import { EuiAvatar, EuiAvatarProps } from '@elastic/eui';
import { useContentItem } from '../../context';

export interface Props {
  id: string;
  size?: EuiAvatarProps['size'];
}

export const ContentAvatar: React.FC<Props> = ({id, size}) => {
  const { data } = useContentItem(id);

  if (!data) return null;

  const title = data.title || '';

  return (
    <EuiAvatar size={size} type="space" name={title} />
  );  
};
