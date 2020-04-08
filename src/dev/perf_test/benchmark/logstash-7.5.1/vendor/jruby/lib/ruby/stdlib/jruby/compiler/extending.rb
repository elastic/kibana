module JRuby::Compiler
  EXTENSION_STRING = <<JAVA
  public IRubyObject callSuper(ThreadContext context, IRubyObject[] args, Block block) {
    return org.jruby.BasicObjectStub.callSuper(this, context, args, block);
  }

  public IRubyObject callMethod(ThreadContext context, String name) {
    return org.jruby.BasicObjectStub..callMethod(this, context, name);
  }

  public IRubyObject callMethod(ThreadContext context, String name, IRubyObject arg) {
    return org.jruby.BasicObjectStub.callMethod(this, context, name, arg);
  }

  public IRubyObject callMethod(ThreadContext context, String name, IRubyObject[] args) {
    return org.jruby.BasicObjectStub.callMethod(this, context, name, args);
  }

  public IRubyObject callMethod(ThreadContext context, String name, IRubyObject[] args, Block block) {
    return org.jruby.BasicObjectStub.callMethod(this, context, name, args, block);
  }

  public IRubyObject callMethod(ThreadContext context, int methodIndex, String name) {
    return org.jruby.BasicObjectStub.callMethod(this, context, methodIndex, name);
  }

  public IRubyObject callMethod(ThreadContext context, int methodIndex, String name, IRubyObject arg) {
    return org.jruby.BasicObjectStub.callMethod(this, context, methodIndex, name, arg);
  }

  public boolean isNil() {
    return org.jruby.BasicObjectStub.isNil(this);
  }

  public boolean isTrue() {
    return org.jruby.BasicObjectStub.isTrue(this);
  }

  public boolean isTaint() {
    return org.jruby.BasicObjectStub.isTaint(this);
  }

  public void setTaint(boolean b) {
    return org.jruby.BasicObjectStub.setTaint(this, b);
  }

  public IRubyObject infectBy(IRubyObject obj) {
    return org.jruby.BasicObjectStub.infectBy(this, obj);
  }

  public boolean isFrozen() {
    return org.jruby.BasicObjectStub.isFrozen(this);
  }

  public void setFrozen(boolean b) {
    return org.jruby.BasicObjectStub.setFrozen(this);
  }

  public boolean isUntrusted() {
    return org.jruby.BasicObjectStub.isUntrusted(this);
  }

  public void setUntrusted(boolean b) {
    return org.jruby.BasicObjectStub.setUntrusted(this);
  }

  public boolean isImmediate() {
    return org.jruby.BasicObjectStub.isImmediate(this);
  }

  public RubyClass getMetaClass() {
    return __metaclass__;
  }

  public RubyClass getSingletonClass() {
    return org.jruby.BasicObjectStub.getSingletonClass(this);
  }

  public RubyClass getType() {
    return org.jruby.BasicObjectStub.getType(this);
  }

  public boolean respondsTo(String name) {
    return org.jruby.BasicObjectStub.resondsTo(this, name);
  }

  public Ruby getRuntime() {
    return __ruby__;
  }

  public Class getJavaClass() {
      return getClass();
  }

  public String asJavaString() {
    return org.jruby.BasicObjectStub.asJavaString(this);
  }

  public RubyString asString() {
    return org.jruby.BasicObjectStub.asString(this);
  }

  public RubyArray convertToArray() {
    return org.jruby.BasicObjectStub.convertToArray(this);
  }

  public RubyHash convertToHash() {
    return org.jruby.BasicObjectStub.convertToHash(this);
  }

  public RubyFloat convertToFloat() {
    return org.jruby.BasicObjectStub.convertToFloat(this);
  }

  public RubyInteger convertToInteger() {
    return org.jruby.BasicObjectStub.convertToInteger(this);
  }

  public RubyInteger convertToInteger(int convertMethodIndex, String convertMethod) {
    return org.jruby.BasicObjectStub.convertToInteger(this, convertMethodIndex, convertMethod);
  }

  public RubyInteger convertToInteger(String convertMethod) {
    return org.jruby.BasicObjectStub.convertToInteger(this, convertMethod);
  }

  public RubyString convertToString() {
    return org.jruby.BasicObjectStub.convertToString(this);
  }

  public IRubyObject anyToString() {
    return org.jruby.BasicObjectStub.anyToString(this);
  }

  public IRubyObject checkStringType() {
    return org.jruby.BasicObjectStub.checkStringType(this);
  }

  public IRubyObject checkArrayType() {
    return org.jruby.BasicObjectStub.checkArrayType(this);
  }

  public Object toJava(Class cls) {
    return org.jruby.BasicObjectStub.toJava(cls);
  }

  public IRubyObject dup() {
    return org.jruby.BasicObjectStub.dup(this);
  }

  public IRubyObject inspect() {
    return org.jruby.BasicObjectStub.inspect(this);
  }

  public IRubyObject rbClone() {
    return org.jruby.BasicObjectStub.rbClone(this);
  }

  public boolean isModule() {
    return org.jruby.BasicObjectStub.isModule(this);
  }

  public boolean isClass() {
    return org.jruby.BasicObjectStub.isClass(this);
  }

  public void dataWrapStruct(Object obj) {
    return org.jruby.BasicObjectStub.dataWrapStruct(this, obj);
  }

  public Object dataGetStruct() {
    return org.jruby.BasicObjectStub.dataGetStruct(this);
  }

  public Object dataGetStructChecked() {
    return org.jruby.BasicObjectStub.dataGetStructChecked(this);
  }

  public IRubyObject id() {
    return org.jruby.BasicObjectStub.id(this);
  }

  public IRubyObject op_equal(ThreadContext context, IRubyObject other) {
    return org.jruby.BasicObjectStub.op_equal(this, context, other);
  }

  public IRubyObject op_eqq(ThreadContext context, IRubyObject other) {
    return org.jruby.BasicObjectStub.op_eqq(this, context, other);
  }

  public boolean eql(IRubyObject other) {
      return self == other;
  }

  public void addFinalizer(IRubyObject finalizer) {
    return org.jruby.BasicObjectStub.addFinalizer(this, finalizer);
  }

  public void removeFinalizers() {
    return org.jruby.BasicObjectStub.removeFinalizers(this);
  }

  public boolean hasVariables() {
    return org.jruby.BasicObjectStub.hasVariables(this);
  }

  public int getVariableCount() {
    return org.jruby.BasicObjectStub.getVariableCount(this);
  }

  public void syncVariables(List<Variable<Object>> variables) {
    return org.jruby.BasicObjectStub.syncVariables(this, variables);
  }

  public List<Variable<Object>> getVariableList() {
    return org.jruby.BasicObjectStub.getVariableList(this);
  }

  public InstanceVariables getInstanceVariables() {
    return org.jruby.BasicObjectStub.getInstanceVariables(this);
  }

  public InternalVariables getInternalVariables() {
    return org.jruby.BasicObjectStub.getInternalVariables(this);
  }

  public List<String> getVariableNameList() {
    return org.jruby.BasicObjectStub.getVariableNameList(this);
  }

  public void copySpecialInstanceVariables(IRubyObject clone) {
    return org.jruby.BasicObjectStub.copySpecialInstanceVariables(this);
  }

  public Object getVariable(int index) {
    return org.jruby.BasicObjectStub.getVariable(this, index);
  }

  public void setVariable(int index, Object value) {
    return org.jruby.BasicObjectStub.setVariable(this, index, value);
  }
JAVA
end