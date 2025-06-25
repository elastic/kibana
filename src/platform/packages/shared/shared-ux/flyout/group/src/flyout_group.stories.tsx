/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-console */

import { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';

import {
  EuiButton,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import {
  EuiFlyoutSessionOpenChildOptions,
  EuiFlyoutSessionOpenMainOptions,
  EuiFlyoutSessionProvider,
  EuiFlyoutSessionRenderContext,
  useEuiFlyoutSession,
} from '@elastic/eui';

interface ECommerceContentProps {
  itemQuantity: number;
}
interface ShoppingCartContentProps extends ECommerceContentProps {
  onQuantityChange: (delta: number) => void;
  isChildOpen?: boolean;
  isMainOpen?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ReviewOrderContentProps extends ECommerceContentProps {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ItemDetailsContentProps extends ECommerceContentProps {}

interface DemoAppMetaForContext {
  selectedMainFlyoutKey?: 'shoppingCart' | 'reviewOrder';
  selectedChildFlyoutKey?: 'itemDetails';
}

const ShoppingCartContent: React.FC<ShoppingCartContentProps> = ({
  itemQuantity,
  onQuantityChange,
  isChildOpen,
  isMainOpen,
}) => {
  const { openChildFlyout, openFlyout, closeChildFlyout, clearHistory } = useEuiFlyoutSession();

  const handleOpenChildDetails = () => {
    const options: EuiFlyoutSessionOpenChildOptions<DemoAppMetaForContext> = {
      size: 's',
      meta: { selectedChildFlyoutKey: 'itemDetails' },
      flyoutProps: {
        className: 'demoFlyoutChild',
        'aria-label': 'Item details',
      },
      onUnmount: () => console.log('Unmounted item details child flyout'),
    };
    openChildFlyout(options);
  };

  const handleProceedToReview = () => {
    const reviewFlyoutSize = 'm';
    const options: EuiFlyoutSessionOpenMainOptions<DemoAppMetaForContext> = {
      size: reviewFlyoutSize,
      meta: { selectedMainFlyoutKey: 'reviewOrder' },
      flyoutProps: {
        'aria-label': 'Review order',
      },
      onUnmount: () => console.log(`Unmounted review order flyout (${reviewFlyoutSize})`),
    };
    openFlyout(options);
  };

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="flyout-shopping-cart-title">Shopping cart</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText>
          <p>Item: Flux Capacitor</p>
        </EuiText>
        <EuiButton
          onClick={isChildOpen ? closeChildFlyout : handleOpenChildDetails}
          isDisabled={!isMainOpen}
        >
          {isChildOpen ? 'Close item details' : 'View item details'}
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
        </EuiButton>{' '}
        <EuiButton
          onClick={() => onQuantityChange(1)}
          iconType="plusInCircle"
          aria-label="Increase quantity"
        >
          +1
        </EuiButton>
        <EuiSpacer />
        <EuiButton
          onClick={handleProceedToReview}
          isDisabled={!isMainOpen || itemQuantity <= 0}
          fill
        >
          Proceed to review
        </EuiButton>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiButton onClick={clearHistory} color="danger">
          Close
        </EuiButton>
      </EuiFlyoutFooter>
    </>
  );
};

const ReviewOrderContent: React.FC<ReviewOrderContentProps> = ({ itemQuantity }) => {
  const { goBack, clearHistory } = useEuiFlyoutSession();
  const [orderConfirmed, setOrderConfirmed] = useState(false);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="flyout-review-order-title">Review order</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText>
          <h3>Review your order</h3>
          <p>Item: Flux Capacitor</p>
          <p>Quantity: {itemQuantity}</p>
        </EuiText>
        <EuiSpacer />
        {orderConfirmed ? (
          <EuiText>
            <p>Order confirmed!</p>
          </EuiText>
        ) : (
          <EuiButton onClick={() => setOrderConfirmed(true)} fill color="accent">
            Confirm purchase
          </EuiButton>
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        {!orderConfirmed && (
          <EuiButton onClick={goBack} color="danger">
            Go back
          </EuiButton>
        )}{' '}
        <EuiButton onClick={clearHistory} color="danger">
          Close
        </EuiButton>
      </EuiFlyoutFooter>
    </>
  );
};

const ItemDetailsContent: React.FC<ItemDetailsContentProps> = ({ itemQuantity }) => {
  const { closeChildFlyout } = useEuiFlyoutSession();
  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="flyout-item-details-title">Item details</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
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
const AdvancedDemoAppControls: React.FC = () => {
  const { openFlyout, goBack, isFlyoutOpen, canGoBack, isChildFlyoutOpen, closeChildFlyout } =
    useEuiFlyoutSession();

  const handleOpenShoppingCart = () => {
    const options: EuiFlyoutSessionOpenMainOptions<DemoAppMetaForContext> = {
      size: 'm',
      meta: { selectedMainFlyoutKey: 'shoppingCart' },
      flyoutProps: {
        type: 'push',
        pushMinBreakpoint: 'xs',
        className: 'shoppingCartFlyoutMain',
        'aria-label': 'Shopping cart',
        onClose: (event) => {
          console.log('Shopping cart onClose triggered', event);
        },
      },
      onUnmount: () => console.log('Unmounted shopping cart flyout'),
    };
    openFlyout(options);
  };

  return (
    <>
      <EuiButton onClick={handleOpenShoppingCart} isDisabled={isFlyoutOpen} fill>
        Open shopping cart
      </EuiButton>
      <EuiSpacer size="s" />
      <EuiButton onClick={closeChildFlyout} isDisabled={!isChildFlyoutOpen} color="warning">
        Close child flyout
      </EuiButton>
      <EuiSpacer size="s" />
      <EuiButton onClick={goBack} isDisabled={!canGoBack} color="warning">
        Close/Go back
      </EuiButton>
      <EuiSpacer size="s" />
    </>
  );
};

const AdvancedDemoApp: React.FC = () => {
  const [itemQuantity, setItemQuantity] = useState(1);

  const handleQuantityChange = (delta: number) => {
    setItemQuantity((prev) => Math.max(0, prev + delta));
  };

  // Render function for MAIN flyout content
  const renderMainFlyoutContent = (
    context: EuiFlyoutSessionRenderContext<DemoAppMetaForContext>
  ) => {
    const { meta, activeFlyoutGroup } = context;
    const { selectedMainFlyoutKey: flyoutKey } = meta || {};

    if (flyoutKey === 'shoppingCart') {
      return (
        <ShoppingCartContent
          itemQuantity={itemQuantity}
          onQuantityChange={handleQuantityChange}
          isChildOpen={activeFlyoutGroup?.isChildOpen}
          isMainOpen={activeFlyoutGroup?.isMainOpen}
        />
      );
    }
    if (flyoutKey === 'reviewOrder') {
      return <ReviewOrderContent itemQuantity={itemQuantity} />;
    }

    console.warn('renderMainFlyoutContent: Unknown flyout key', meta);
    return null;
  };

  // Render function for CHILD flyout content
  const renderChildFlyoutContent = (
    context: EuiFlyoutSessionRenderContext<DemoAppMetaForContext>
  ) => {
    const { meta } = context;
    const { selectedChildFlyoutKey: flyoutKey } = meta || {};

    if (flyoutKey === 'itemDetails') {
      return <ItemDetailsContent itemQuantity={itemQuantity} />;
    }

    console.warn('renderChildFlyoutContent: Unknown flyout key', meta);
    return null;
  };

  return (
    <EuiFlyoutSessionProvider
      renderMainFlyoutContent={renderMainFlyoutContent}
      renderChildFlyoutContent={renderChildFlyoutContent}
    >
      <AdvancedDemoAppControls />
    </EuiFlyoutSessionProvider>
  );
};

export default {
  title: 'Flyout Group/FlyoutSession',
  component: EuiFlyoutSessionProvider,
} as Meta<typeof EuiFlyoutSessionProvider>;

export const FlyoutGroupAdvanced: StoryObj = {
  name: 'Flyout Session with History',
  render: () => {
    return <AdvancedDemoApp />;
  },
};

const SimpleFlyoutAppControls: React.FC = () => {
  const { openFlyout, isFlyoutOpen } = useEuiFlyoutSession();

  const handleOpenSimpleFlyout = () => {
    openFlyout({
      size: 'm',
      meta: {},
    });
  };

  return (
    <>
      <EuiButton onClick={handleOpenSimpleFlyout} isDisabled={isFlyoutOpen} fill>
        Open simple flyout
      </EuiButton>
    </>
  );
};

const SimpleFlyoutApp: React.FC = () => {
  const renderMainFlyoutContent = () => (
    <EuiFlyoutBody>
      <EuiText>
        <p>Simple flyout content</p>
      </EuiText>
    </EuiFlyoutBody>
  );

  return (
    <>
      <EuiText>
        <p>
          To use a simple flyout, declare a `renderMainFlyoutContent` function that returns the
          flyout content, and pass it to the `EuiFlyoutSessionProvider`. To open the flyout, use the
          `openFlyout` function which you access from `useEuiFlyoutSession`.
        </p>
      </EuiText>
      <EuiSpacer />
      <EuiFlyoutSessionProvider renderMainFlyoutContent={renderMainFlyoutContent}>
        <SimpleFlyoutAppControls />
      </EuiFlyoutSessionProvider>
    </>
  );
};

export const FlyoutSimple: StoryObj = {
  name: 'Simple Flyout',
  render: () => {
    return <SimpleFlyoutApp />;
  },
};

const SimpleFlyoutGroupAppControls: React.FC = () => {
  const { openFlyoutGroup, isFlyoutOpen } = useEuiFlyoutSession();

  const handleOpenSimpleFlyoutGroup = () => {
    openFlyoutGroup({
      main: {
        size: 's',
      },
      child: {
        size: 's',
      },
    });
  };

  return (
    <>
      <EuiButton onClick={handleOpenSimpleFlyoutGroup} isDisabled={isFlyoutOpen} fill>
        Open simple flyout group
      </EuiButton>
    </>
  );
};

const SimpleFlyoutGroupApp: React.FC = () => {
  const renderMainFlyoutContent = () => (
    <EuiFlyoutBody>
      <EuiText>
        <p>Simple flyout content</p>
      </EuiText>
    </EuiFlyoutBody>
  );

  const renderChildFlyoutContent = () => (
    <EuiFlyoutBody>
      <EuiText>
        <p>Simple child flyout content</p>
      </EuiText>
    </EuiFlyoutBody>
  );

  return (
    <>
      <EuiText>
        <p>
          To use a simple flyout group, declare a `renderMainFlyoutContent` function that returns
          the main flyout content, and a `renderChildFlyoutContent` function that returns the child
          flyout content. Pass both functions to the `EuiFlyoutSessionProvider`. To open the flyout,
          use the `openFlyout` function and the `openChildFlyout` function which you access from
          `useEuiFlyoutSession`.
        </p>
      </EuiText>
      <EuiSpacer />
      <EuiFlyoutSessionProvider
        renderMainFlyoutContent={renderMainFlyoutContent}
        renderChildFlyoutContent={renderChildFlyoutContent}
      >
        <SimpleFlyoutGroupAppControls />
      </EuiFlyoutSessionProvider>
    </>
  );
};

export const FlyoutSimpleGroup: StoryObj = {
  name: 'Simple Flyout Group',
  render: () => {
    return <SimpleFlyoutGroupApp />;
  },
};
