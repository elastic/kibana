public class MyObjectTest {
  public static void main(String[] args) {
    MyObject2 obj = new MyObject2();
    obj.booleanMethod(false);
    obj.byteMethod((byte)1);
    obj.shortMethod((short)1);
    obj.charMethod((char)1);
    obj.intMethod(1);
    obj.longMethod(1L);
    obj.floatMethod(1.0f);
    obj.doubleMethod(1.0);
  }
}
