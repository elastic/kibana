/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useEffect } from 'react';
import { action } from '@storybook/addon-actions';
import type { StoryObj, Meta } from '@storybook/react';
import {
  EuiButton,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiCodeBlock,
} from '@elastic/eui';

import {
  FlyoutSystemProvider,
  FlyoutSystemState,
  useFlyoutSystemContext,
} from './flyout_system_provider';
import { useFlyoutSystemApi } from './use_flyout_system';

const loggerAction = action('flyout-system-log');

const meta: Meta<typeof FlyoutSystemProvider> = {
  title: 'Layout/EuiFlyout/Flyout System',
  component: FlyoutSystemProvider,
};

export default meta;

// Component to display the internal state for debugging
const InternalState: React.FC<{ state: FlyoutSystemState }> = ({ state }) => {
  return (
    <>
      <EuiTitle size="s">
        <h3>Internal state</h3>
      </EuiTitle>
      <EuiCodeBlock language="json">{JSON.stringify(state, null, 2)}</EuiCodeBlock>
    </>
  );
};

// E-Commerce Example Components

// Props types for the E-commerce content components
interface ECommerceContentProps {
  itemQuantity: number;
}
interface ShoppingCartContentProps extends ECommerceContentProps {
  onQuantityChange: (delta: number) => void;
}
// Use type instead of empty interface
type ReviewOrderContentProps = ECommerceContentProps;
// Use type instead of empty interface
type ItemDetailsContentProps = ECommerceContentProps;

// Shopping Cart component to be displayed in the main flyout
const ShoppingCartContent: React.FC<ShoppingCartContentProps> = ({
  itemQuantity,
  onQuantityChange,
}) => {
  const { openChildFlyout, openFlyout, isChildFlyoutOpen, closeChildFlyout, closeSession } =
    useFlyoutSystemApi();

  const handleOpenItemDetails = () => {
    openChildFlyout({
      size: 's',
      title: 'Item details',
      content: <ItemDetailsContent itemQuantity={itemQuantity} />,
      flyoutProps: {
        className: 'itemDetailsFlyoutChild',
        'aria-label': 'Item details',
        onClose: () => {
          loggerAction('Item details onClose triggered');
          closeChildFlyout(); // If we add an onClose handler to the child flyout, we have to call closeChildFlyout within it for the flyout to actually close
        },
      },
    });
  };

  const handleProceedToReview = () => {
    openFlyout({
      size: 'm',
      content: <ReviewOrderContent itemQuantity={itemQuantity} />,
      flyoutProps: {
        type: 'push',
        className: 'reviewOrderFlyoutMain',
        'aria-label': 'Review order',
        onClose: () => {
          loggerAction('Review order onClose triggered');
          closeSession(); // If we add an onClose handler to the main flyout, we have to call closeSession within it for the flyout to actually close
        },
      },
    });
  };

  return (
    <>
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <h2 id="flyout-shopping-cart-title">Shopping cart</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText>
          <p>Item: Flux Capacitor</p>
        </EuiText>
        <EuiButton onClick={isChildFlyoutOpen ? closeChildFlyout : handleOpenItemDetails}>
          {isChildFlyoutOpen ? 'Close item details' : 'View item details'}
        </EuiButton>
        <EuiSpacer />
        <EuiText>Quantity: {itemQuantity}</EuiText>
        <EuiButton
          onClick={() => onQuantityChange(-1)}
          iconType="minusInCircle"
          aria-label="Decrease quantity"
          isDisabled={itemQuantity <= 0}
        >
          -1
        </EuiButton>
        <EuiButton
          onClick={() => onQuantityChange(1)}
          iconType="plusInCircle"
          aria-label="Increase quantity"
        >
          +1
        </EuiButton>
        <EuiSpacer />
        <EuiButton onClick={handleProceedToReview} isDisabled={itemQuantity <= 0} fill>
          Proceed to review
        </EuiButton>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiButton onClick={closeSession} color="danger">
          Close
        </EuiButton>
      </EuiFlyoutFooter>
    </>
  );
};

// Review Order content to be displayed in the main flyout
const ReviewOrderContent: React.FC<ReviewOrderContentProps> = ({ itemQuantity }) => {
  const { closeSession } = useFlyoutSystemApi();

  return (
    <>
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <h2 id="flyout-review-order-title">Review order</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText>
          <p>Item: Flux Capacitor</p>
          <p>Quantity: {itemQuantity}</p>
        </EuiText>
        <EuiSpacer />
        <EuiButton fill color="accent">
          Confirm purchase
        </EuiButton>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiButton onClick={closeSession} color="danger">
          Close
        </EuiButton>
      </EuiFlyoutFooter>
    </>
  );
};

// Item Details content to be displayed in the child flyout
const ItemDetailsContent: React.FC<ItemDetailsContentProps> = ({ itemQuantity }) => {
  const { closeChildFlyout } = useFlyoutSystemApi();

  return (
    <>
      <EuiFlyoutBody>
        <EuiText>
          <p>
            <strong>Item:</strong> Flux Capacitor
          </p>
          <p>
            <strong>Selected quantity:</strong> {itemQuantity}
          </p>
          <p>This amazing device makes time travel possible! Handle with care.</p>
        </EuiText>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiButton onClick={closeChildFlyout} color="danger">
          Close details
        </EuiButton>
      </EuiFlyoutFooter>
    </>
  );
};

// Component for the main control buttons and state display
const ECommerceAppControls: React.FC = () => {
  const {
    openFlyout,
    goBack,
    isFlyoutOpen,
    canGoBack,
    isChildFlyoutOpen,
    closeChildFlyout,
    closeSession,
  } = useFlyoutSystemApi();

  // Access the context for displaying raw state
  const { state } = useFlyoutSystemContext();

  const handleCloseOrGoBack = () => {
    if (canGoBack) {
      goBack();
    } else {
      closeSession();
    }
  };

  const handleOpenShoppingCart = () => {
    openFlyout({
      size: 'm',
      content: <ShoppingCartContent itemQuantity={1} onQuantityChange={() => {}} />,
      flyoutProps: {
        type: 'push',
        pushMinBreakpoint: 'xs',
        className: 'shoppingCartFlyoutMain',
        'aria-label': 'Shopping cart',
        onClose: (event) => {
          loggerAction('Shopping cart onClose triggered', event);
          closeSession(); // If we add an onClose handler to the main flyout, we have to call closeSession within it for the flyout to actually close
        },
      },
    });
  };

  return (
    <>
      <EuiButton onClick={handleOpenShoppingCart} isDisabled={isFlyoutOpen} fill>
        Open shopping cart
      </EuiButton>
      <EuiSpacer />
      <EuiButton onClick={closeChildFlyout} isDisabled={!isChildFlyoutOpen} color="warning">
        Close child flyout
      </EuiButton>
      <EuiSpacer />
      <EuiButton onClick={handleCloseOrGoBack} isDisabled={!isFlyoutOpen} color="warning">
        Close/Go back
      </EuiButton>
      <EuiSpacer />
      <InternalState state={state} />
    </>
  );
};

const ECommerceApp: React.FC = () => {
  const [itemQuantity, setItemQuantity] = useState(1);

  const handleQuantityChange = (delta: number) => {
    setItemQuantity((prev) => Math.max(0, prev + delta));
  };

  return (
    <FlyoutSystemProvider
      onUnmount={() => {
        loggerAction('All flyouts have been unmounted');
      }}
    >
      <ECommerceAppControls />
    </FlyoutSystemProvider>
  );
};

export const ECommerceWithHistory: StoryObj = {
  name: 'Advanced Use Case',
  render: () => {
    return <ECommerceApp />;
  },
};

// Deep History Navigation Example

type PageType = 'page01' | 'page02' | 'page03' | 'page04' | 'page05';

const DeepHistoryPage: React.FC<{ page: PageType }> = ({ page }) => {
  const { openFlyout, closeSession } = useFlyoutSystemApi();
  const [nextPage, setNextPage] = useState<PageType | ''>('');

  useEffect(() => {
    switch (page) {
      case 'page01':
        setNextPage('page02');
        break;
      case 'page02':
        setNextPage('page03');
        break;
      case 'page03':
        setNextPage('page04');
        break;
      case 'page04':
        setNextPage('page05');
        break;
      case 'page05':
        setNextPage('');
        break;
    }
  }, [page]);

  const handleOpenNextFlyout = () => {
    if (nextPage) {
      openFlyout({
        size: 'm',
        content: <DeepHistoryPage page={nextPage as PageType} />,
        flyoutProps: {
          type: 'push',
          pushMinBreakpoint: 'xs',
          'aria-label': nextPage,
        },
      });
    }
  };

  return (
    <>
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <h2 id="flyout-page-title">Page {page}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {nextPage === '' ? (
          <>
            <EuiText>
              <p>
                This is the content for {page}.<br />
                You have reached the end of the history.
              </p>
            </EuiText>
          </>
        ) : (
          <>
            <EuiText>
              <p>This is the content for {page}.</p>
            </EuiText>
            <EuiSpacer />
            <EuiButton onClick={handleOpenNextFlyout}>Navigate to {nextPage}</EuiButton>
          </>
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiButton onClick={closeSession} color="danger">
          Close
        </EuiButton>
      </EuiFlyoutFooter>
    </>
  );
};

// Component for the main control buttons and state display
const DeepHistoryAppControls: React.FC = () => {
  const { openFlyout, isFlyoutOpen } = useFlyoutSystemApi();
  const { state } = useFlyoutSystemContext();

  const handleOpenFlyout = () => {
    openFlyout({
      size: 'm',
      content: <DeepHistoryPage page="page01" />,
      flyoutProps: {
        type: 'push',
        pushMinBreakpoint: 'xs',
        'aria-label': 'Page 01',
      },
    });
  };

  return (
    <>
      <EuiButton onClick={handleOpenFlyout} isDisabled={isFlyoutOpen} fill>
        Begin flyout navigation
      </EuiButton>
      <EuiSpacer />
      <InternalState state={state} />
    </>
  );
};

const DeepHistoryApp: React.FC = () => {
  return (
    <FlyoutSystemProvider onUnmount={() => loggerAction('System flyouts have been unmounted')}>
      <DeepHistoryAppControls />
    </FlyoutSystemProvider>
  );
};

export const DeepHistory: StoryObj = {
  name: 'Deep History Navigation',
  render: () => {
    return <DeepHistoryApp />;
  },
};
