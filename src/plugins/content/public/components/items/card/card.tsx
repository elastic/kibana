import React from 'react';
import {
  EuiButton,
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import {useContentItem} from '../../context';

export interface Props {
  id: string;
}

export const ContentCard: React.FC<Props> = ({id}) => {
  const { data } = useContentItem(id);

  if (!data) return null;

  const title = data.title || '';

  return (
    <EuiCard
      textAlign="left"
      title={title}
      description="Example of a card's description. Stick to one or two sentences."
      footer={
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButton>Go for it</EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    />
  );  
};
